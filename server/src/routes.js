import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Skill from './models/Skill.js';
import Profile from './models/Profile.js';
import Exchange from './models/Exchange.js';
import Review from './models/Review.js';
import { seedSkills } from './data/seedSkills.js';
import { readProfiles, writeProfiles } from './data/localProfiles.js';
import { readMessages, writeMessages } from './data/localMessages.js';
import { readCollection, writeCollection } from './data/localCollections.js';

const router = express.Router();
let localSkills = seedSkills;

const mailer = process.env.SMTP_HOST ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }) : null;

async function sendVerificationEmail(email, token) {
  if (!mailer) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email service is not configured.');
    return;
  }
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}?verify=${encodeURIComponent(token)}`;
  await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: email, subject: 'Verify your SkillSwap account', text: `Verify your SkillSwap account: ${verifyUrl}`, html: `<p>Welcome to SkillSwap.</p><p><a href="${verifyUrl}">Verify your email address</a> to activate your account.</p><p>This link expires in 24 hours.</p>` });
}

function createVerificationToken(email) {
  const token = `verify-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tokens = readCollection('resetTokens.json').filter((item) => item.type !== 'verify' || item.expiresAt > Date.now());
  writeCollection('resetTokens.json', [{ token, type: 'verify', email: email.trim().toLowerCase(), expiresAt: Date.now() + 24 * 60 * 60 * 1000 }, ...tokens]);
  return token;
}

function databaseRequired(response) {
  if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
    response.status(503).json({ message: 'Account service is not configured with MongoDB yet.' });
    return true;
  }
  return false;
}

function publicProfile(profile) {
  const { passwordHash: _passwordHash, ...safeProfile } = profile.toObject ? profile.toObject() : profile;
  return safeProfile;
}

router.get('/health', (_request, response) => response.json({ ok: true, mode: process.env.MONGODB_URI ? 'mongodb-ready' : 'memory' }));

router.post('/auth/send-verification', (request, response) => {
  const { email } = request.body;
  if (!email) return response.status(400).json({ message: 'Email is required.' });
  try {
    const token = createVerificationToken(email);
    return sendVerificationEmail(email.trim().toLowerCase(), token).then(() => response.json({ message: 'Verification email sent.' })).catch((error) => response.status(503).json({ message: error.message }));
  } catch (error) {
    return response.status(503).json({ message: error.message });
  }
});

router.post('/auth/verify-email', async (request, response) => {
  const tokens = readCollection('resetTokens.json');
  const record = tokens.find((item) => item.type === 'verify' && item.token === request.body.token && item.expiresAt > Date.now());
  if (!record) return response.status(400).json({ message: 'Verification token is invalid or expired.' });
  if (process.env.MONGODB_URI) {
    const profile = await Profile.findOneAndUpdate({ email: record.email }, { emailVerified: true, verified: true }, { new: true });
    if (!profile) return response.status(404).json({ message: 'Profile not found.' });
  } else {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => profile.email === record.email);
    if (index === -1) return response.status(404).json({ message: 'Profile not found.' });
    profiles[index].emailVerified = true;
    profiles[index].verified = true;
    writeProfiles(profiles);
  }
  writeCollection('resetTokens.json', tokens.filter((item) => item.token !== record.token));
  return response.json({ message: 'Email verified successfully.' });
});

router.get('/profiles/:email/public', async (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  if (!process.env.MONGODB_URI) {
    const profile = readProfiles().find((item) => item.email === email);
    if (!profile) return response.status(404).json({ message: 'Profile not found.' });
    if (profile.profileVisible === false) return response.status(403).json({ message: 'This profile is private.' });
    return response.json({ ...publicProfile(profile), email: undefined });
  }
  const profile = await Profile.findOne({ email });
  if (!profile) return response.status(404).json({ message: 'Profile not found.' });
  const safe = publicProfile(profile);
  delete safe.email;
  return response.json(safe);
});

router.get('/skills', async (request, response) => {
  const { category, search, teach, wants, location, format, level, availability, page = 1, limit = 8, sort = 'newest' } = request.query;
  const pageNumber = Math.max(1, Number(page));
  const pageSize = Math.min(24, Math.max(1, Number(limit)));
  if (!process.env.MONGODB_URI) {
    const filtered = localSkills.filter((skill) => {
      const matchesCategory = !category || category === 'All' || skill.category === category;
      const wantsMatch = !search || skill.wants.toLowerCase().includes(search.toLowerCase()) || skill.title.toLowerCase().includes(search.toLowerCase());
      const teachMatch = !teach || skill.title.toLowerCase().includes(teach.toLowerCase()) || skill.description.toLowerCase().includes(teach.toLowerCase());
      const wantsFieldMatch = !wants || skill.wants.toLowerCase().includes(wants.toLowerCase());
      const locationMatch = !location || skill.teacher.location.toLowerCase().includes(location.toLowerCase());
      const formatMatch = !format || skill.format.toLowerCase().includes(format.toLowerCase());
      const levelMatch = !level || skill.level === level;
      const availabilityMatch = !availability || (skill.availability || 'Flexible') === availability;
      return matchesCategory && wantsMatch && teachMatch && wantsFieldMatch && locationMatch && formatMatch && levelMatch && availabilityMatch;
    });
    const sorted = [...filtered].sort((first, second) => sort === 'rating' ? second.teacher.rating - first.teacher.rating : sort === 'newest' ? String(second._id).localeCompare(String(first._id)) : 0);
    return response.json({ items: sorted.slice((pageNumber - 1) * pageSize, pageNumber * pageSize), page: pageNumber, limit: pageSize, total: sorted.length, hasMore: pageNumber * pageSize < sorted.length });
  }
  const query = {};
  if (category && category !== 'All') query.category = category;
  if (search || wants) query.wants = { $regex: search || wants, $options: 'i' };
  if (teach) query.$or = [{ title: { $regex: teach, $options: 'i' } }, { description: { $regex: teach, $options: 'i' } }];
  if (format) query.format = { $regex: format, $options: 'i' };
  if (level) query.level = level;
  if (location) query['teacher.location'] = { $regex: location, $options: 'i' };
  const total = await Skill.countDocuments(query);
  const items = await Skill.find(query).sort(sort === 'rating' ? { 'teacher.rating': -1 } : { createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize);
  return response.json({ items, page: pageNumber, limit: pageSize, total, hasMore: pageNumber * pageSize < total });
});

router.get('/recommendations/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  const profile = readProfiles().find((item) => item.email === email);
  const interests = profile?.wants?.join(' ').toLowerCase() || '';
  const recommendations = localSkills.filter((skill) => interests && `${skill.title} ${skill.category} ${skill.wants}`.toLowerCase().split(' ').some((word) => word.length > 3 && interests.includes(word))).slice(0, 6);
  return response.json(recommendations);
});

router.get('/profiles/:email/similar', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  const profile = readProfiles().find((item) => item.email === email);
  const interests = [...(profile?.teaches || []), ...(profile?.wants || [])].map((item) => item.toLowerCase());
  const similar = readProfiles().filter((item) => item.email !== email && [...(item.teaches || []), ...(item.wants || [])].some((skill) => interests.some((interest) => skill.toLowerCase().includes(interest)))).slice(0, 6).map(publicProfile);
  return response.json(similar);
});

router.get('/matching/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  const profile = readProfiles().find((item) => item.email === email);
  const wants = (profile?.wants || []).map((item) => item.toLowerCase());
  const teaches = (profile?.teaches || []).map((item) => item.toLowerCase());
  const matches = localSkills.map((skill) => { const text = `${skill.title} ${skill.category} ${skill.wants}`.toLowerCase(); const teachScore = teaches.filter((item) => text.includes(item)).length; const learnScore = wants.filter((item) => text.includes(item)).length; return { skill, matchScore: Math.min(99, 45 + (teachScore * 15) + (learnScore * 20)) }; }).filter((item) => item.matchScore > 45).sort((first, second) => second.matchScore - first.matchScore).slice(0, 8);
  return response.json(matches);
});

router.put('/profiles/:id/portfolio', (request, response) => {
  const { portfolioUrl = '', resumeName = '', certificates = [] } = request.body;
  const profiles = readProfiles();
  const lookup = decodeURIComponent(request.params.id);
  const index = profiles.findIndex((profile) => profile._id === lookup || profile.email === lookup);
  if (index === -1) return response.status(404).json({ message: 'Profile not found.' });
  profiles[index] = { ...profiles[index], portfolioUrl, resumeName, certificates };
  writeProfiles(profiles);
  return response.json(publicProfile(profiles[index]));
});

router.get('/leaderboard', (request, response) => {
  const leaderboard = readProfiles().map((profile) => ({ name: profile.name, avatar: profile.avatar, exchanges: profile.exchanges || 0, rating: profile.rating || 0, verified: profile.verified || false })).sort((first, second) => (second.exchanges - first.exchanges) || (second.rating - first.rating)).slice(0, 20);
  return response.json(leaderboard);
});

router.get('/groups', (_request, response) => response.json(readCollection('groups.json')));
router.post('/groups', (request, response) => { const group = { _id: `group-${Date.now()}`, name: request.body.name, description: request.body.description || '', category: request.body.category || 'General', members: 1 }; const groups = readCollection('groups.json'); writeCollection('groups.json', [group, ...groups]); return response.status(201).json(group); });
router.post('/groups/:id/join', (request, response) => { const groups = readCollection('groups.json'); const index = groups.findIndex((group) => group._id === request.params.id); if (index === -1) return response.status(404).json({ message: 'Group not found.' }); groups[index].members += 1; writeCollection('groups.json', groups); return response.json(groups[index]); });

router.post('/video-rooms', (request, response) => { const room = `skillswap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; return response.status(201).json({ room, url: `https://meet.jit.si/${room}` }); });

router.post('/skills', async (request, response) => {
  const skill = request.body;
  if (!process.env.MONGODB_URI) {
    const created = { ...skill, _id: `local-${Date.now()}`, teacher: { ...skill.teacher, exchanges: 0, rating: 5 } };
    localSkills = [created, ...localSkills];
    return response.status(201).json(created);
  }
  return response.status(201).json(await Skill.create(skill));
});

router.post('/profiles', async (request, response) => {
  if (databaseRequired(response)) return;
  const { name, email, password, teaches = [], wants = [] } = request.body;
  if (!name || !email || !password || password.length < 8) {
    return response.status(400).json({ message: 'Name, email and a password of at least 8 characters are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const profileData = { name: name.trim(), email: normalizedEmail, passwordHash, teaches, wants };

  if (!process.env.MONGODB_URI) {
    const profiles = readProfiles();
    if (profiles.some((profile) => profile.email === normalizedEmail)) {
      return response.status(409).json({ message: 'An account with this email already exists.' });
    }
    const created = { ...profileData, _id: `local-${Date.now()}`, createdAt: new Date().toISOString() };
    writeProfiles([created, ...profiles]);
    const token = createVerificationToken(normalizedEmail);
    await sendVerificationEmail(normalizedEmail, token);
    return response.status(201).json({ message: 'Account created. Check your email to verify it.', verificationRequired: true, email: created.email, developmentToken: mailer ? undefined : token });
  }

  try {
    const created = await Profile.create(profileData);
    const token = createVerificationToken(normalizedEmail);
    await sendVerificationEmail(normalizedEmail, token);
    return response.status(201).json({ message: 'Account created. Check your email to verify it.', verificationRequired: true, email: created.email });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ message: 'An account with this email already exists.' });
    throw error;
  }
});

router.delete('/profiles/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  const profiles = readProfiles();
  const next = profiles.filter((profile) => profile.email !== email);
  if (next.length === profiles.length) return response.status(404).json({ message: 'Profile not found.' });
  writeProfiles(next);
  return response.json({ message: 'Account deleted successfully.' });
});

router.post('/reports', (request, response) => {
  const { reporterEmail, reportedEmail, reason, details = '' } = request.body;
  if (!reporterEmail || !reportedEmail || !reason) return response.status(400).json({ message: 'Reporter, reported user and reason are required.' });
  const report = { _id: `report-${Date.now()}`, reporterEmail, reportedEmail, reason, details, status: 'open', createdAt: new Date().toISOString() };
  const reports = readCollection('reports.json');
  writeCollection('reports.json', [report, ...reports]);
  return response.status(201).json({ message: 'Report submitted. Our team will review it.', report });
});

router.post('/blocks', (request, response) => {
  const { blockerEmail, blockedEmail } = request.body;
  if (!blockerEmail || !blockedEmail) return response.status(400).json({ message: 'Both account emails are required.' });
  const blocks = readCollection('blocks.json');
  if (!blocks.some((block) => block.blockerEmail === blockerEmail && block.blockedEmail === blockedEmail)) writeCollection('blocks.json', [{ blockerEmail, blockedEmail, createdAt: new Date().toISOString() }, ...blocks]);
  return response.json({ message: 'User blocked.' });
});

router.get('/admin/reports', (request, response) => {
  if (!process.env.ADMIN_KEY || request.headers['x-admin-key'] !== process.env.ADMIN_KEY) return response.status(403).json({ message: 'Admin access required.' });
  return response.json(readCollection('reports.json'));
});

router.post('/auth/login', async (request, response) => {
  if (databaseRequired(response)) return;
  const { email, password } = request.body;
  if (!email || !password) return response.status(400).json({ message: 'Email and password are required.' });
  const normalizedEmail = email.trim().toLowerCase();

  if (!process.env.MONGODB_URI) {
    const profile = readProfiles().find((item) => item.email === normalizedEmail);
    if (!profile || !(await bcrypt.compare(password, profile.passwordHash))) {
      return response.status(401).json({ message: 'Invalid email or password.' });
    }
    if (!profile.emailVerified) return response.status(403).json({ message: 'Please verify your email before logging in.' });
    return response.json({ message: 'Login successful.', profile: publicProfile(profile) });
  }

  const profile = await Profile.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!profile || !(await bcrypt.compare(password, profile.passwordHash))) {
    return response.status(401).json({ message: 'Invalid email or password.' });
  }
  if (!profile.emailVerified) return response.status(403).json({ message: 'Please verify your email before logging in.' });
  return response.json({ message: 'Login successful.', profile: publicProfile(profile) });
});

router.post('/auth/change-password', async (request, response) => {
  const { email, currentPassword, newPassword } = request.body;
  if (!email || !currentPassword || !newPassword || newPassword.length < 8) return response.status(400).json({ message: 'Email, current password and a new password of 8+ characters are required.' });
  const normalizedEmail = email.trim().toLowerCase();
  if (!process.env.MONGODB_URI) {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => profile.email === normalizedEmail);
    if (index === -1 || !(await bcrypt.compare(currentPassword, profiles[index].passwordHash))) return response.status(401).json({ message: 'Current password is incorrect.' });
    profiles[index].passwordHash = await bcrypt.hash(newPassword, 12);
    writeProfiles(profiles);
    return response.json({ message: 'Password changed successfully.' });
  }
  const profile = await Profile.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!profile || !(await bcrypt.compare(currentPassword, profile.passwordHash))) return response.status(401).json({ message: 'Current password is incorrect.' });
  profile.passwordHash = await bcrypt.hash(newPassword, 12);
  await profile.save();
  return response.json({ message: 'Password changed successfully.' });
});

router.post('/auth/forgot-password', (request, response) => {
  const { email } = request.body;
  if (!email) return response.status(400).json({ message: 'Email is required.' });
  const token = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tokens = readCollection('resetTokens.json').filter((item) => item.expiresAt > Date.now());
  writeCollection('resetTokens.json', [{ token, email: email.trim().toLowerCase(), expiresAt: Date.now() + 15 * 60 * 1000 }, ...tokens]);
  return response.json({ message: 'If the account exists, reset instructions are ready.', developmentToken: process.env.NODE_ENV === 'production' ? undefined : token });
});

router.post('/auth/reset-password', async (request, response) => {
  const { token, newPassword } = request.body;
  const tokens = readCollection('resetTokens.json');
  const record = tokens.find((item) => item.token === token && item.expiresAt > Date.now());
  if (!record || !newPassword || newPassword.length < 8) return response.status(400).json({ message: 'Reset token is invalid or expired.' });
  const profiles = readProfiles();
  const index = profiles.findIndex((profile) => profile.email === record.email);
  if (index === -1) return response.status(404).json({ message: 'Profile not found.' });
  profiles[index].passwordHash = await bcrypt.hash(newPassword, 12);
  writeProfiles(profiles);
  writeCollection('resetTokens.json', tokens.filter((item) => item.token !== token));
  return response.json({ message: 'Password reset successfully.' });
});

router.put('/profiles/:id', async (request, response) => {
  const { name, email, avatar = '', location = '', bio = '', teaches = [], wants = [], profileVisible = true, allowMessages = true } = request.body;
  if (!name || !email) return response.status(400).json({ message: 'Name and email are required.' });
  const profileData = { name: name.trim(), email: email.trim().toLowerCase(), avatar, location, bio, teaches, wants, profileVisible, allowMessages };

  if (!process.env.MONGODB_URI) {
    const profiles = readProfiles();
    const lookup = decodeURIComponent(request.params.id);
    const index = profiles.findIndex((profile) => profile._id === lookup || profile.email === lookup);
    if (index === -1) return response.status(404).json({ message: 'Profile not found.' });
    const updated = { ...profiles[index], ...profileData };
    writeProfiles(profiles.toSpliced(index, 1, updated));
    return response.json(publicProfile(updated));
  }

  const lookup = decodeURIComponent(request.params.id);
  const query = mongoose.isValidObjectId(lookup) ? { _id: lookup } : { email: lookup };
  const updated = await Profile.findOneAndUpdate(query, profileData, { new: true, runValidators: true });
  if (!updated) return response.status(404).json({ message: 'Profile not found.' });
  return response.json(publicProfile(updated));
});

router.post('/exchanges', (request, response) => {
  const exchange = { _id: `exchange-${Date.now()}`, ...request.body, status: 'pending', createdAt: new Date().toISOString() };
  const exchanges = readCollection('exchanges.json');
  writeCollection('exchanges.json', [exchange, ...exchanges]);
  return response.status(201).json(exchange);
});

router.get('/exchanges/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  return response.json(readCollection('exchanges.json').filter((item) => item.requesterEmail === email || item.ownerEmail === email));
});

router.patch('/exchanges/:id', (request, response) => {
  const exchanges = readCollection('exchanges.json');
  const index = exchanges.findIndex((item) => item._id === request.params.id);
  if (index === -1) return response.status(404).json({ message: 'Exchange not found.' });
  exchanges[index] = { ...exchanges[index], status: request.body.status };
  writeCollection('exchanges.json', exchanges);
  return response.json(exchanges[index]);
});

router.patch('/exchanges/:id/schedule', (request, response) => {
  const exchanges = readCollection('exchanges.json');
  const index = exchanges.findIndex((item) => item._id === request.params.id);
  if (index === -1) return response.status(404).json({ message: 'Exchange not found.' });
  exchanges[index] = { ...exchanges[index], scheduledAt: request.body.scheduledAt, meetingLink: request.body.meetingLink || '' };
  writeCollection('exchanges.json', exchanges);
  return response.json(exchanges[index]);
});

router.post('/reviews', (request, response) => {
  const { reviewerEmail, reviewerName, recipientEmail, rating, text } = request.body;
  if (!reviewerEmail || !recipientEmail || !rating || !text?.trim() || rating < 1 || rating > 5) return response.status(400).json({ message: 'Reviewer, recipient, rating and review text are required.' });
  const review = { _id: `review-${Date.now()}`, reviewerEmail, reviewerName, recipientEmail, rating: Number(rating), text: text.trim(), createdAt: new Date().toISOString() };
  const reviews = readCollection('reviews.json');
  writeCollection('reviews.json', [review, ...reviews]);
  return response.status(201).json(review);
});

router.get('/reviews/:email', (request, response) => response.json(readCollection('reviews.json').filter((review) => review.recipientEmail === decodeURIComponent(request.params.email).toLowerCase())));

router.post('/messages', (request, response) => {
  const { senderName, senderEmail, recipientName, recipientEmail = '', message } = request.body;
  if (!senderName || !senderEmail || !recipientName || !message?.trim()) {
    return response.status(400).json({ message: 'Sender, recipient and message are required.' });
  }
  const recipientProfile = recipientEmail ? readProfiles().find((profile) => profile.email === recipientEmail.toLowerCase()) : null;
  if (recipientProfile?.allowMessages === false) return response.status(403).json({ message: 'This user has disabled direct messages.' });
  const blocks = readCollection('blocks.json');
  if (blocks.some((block) => block.blockerEmail === recipientEmail.toLowerCase() && block.blockedEmail === senderEmail.toLowerCase())) return response.status(403).json({ message: 'You cannot message this user.' });
  if (message.trim().length > 2000) return response.status(413).json({ message: 'Message is too long.' });
  const created = { _id: `message-${Date.now()}`, senderName, senderEmail, recipientName, recipientEmail, message: message.trim(), status: 'sent', read: false, createdAt: new Date().toISOString() };
  const messages = readMessages();
  if (messages.some((item) => item.senderEmail === senderEmail && item.message === message.trim() && Date.now() - Date.parse(item.createdAt) < 30000)) return response.status(429).json({ message: 'Please wait before sending the same message again.' });
  writeMessages([created, ...messages]);
  if (recipientEmail) {
    const notifications = readCollection('notifications.json');
    writeCollection('notifications.json', [{ _id: `notification-${Date.now()}`, email: recipientEmail.toLowerCase(), type: 'message', title: `${senderName} sent you a message`, read: false, createdAt: new Date().toISOString() }, ...notifications]);
  }
  return response.status(201).json(created);
});

router.get('/messages/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  return response.json(readMessages().filter((message) => message.senderEmail === email || message.recipientEmail === email));
});

router.patch('/messages/:id/read', (request, response) => {
  const messages = readMessages();
  const index = messages.findIndex((message) => message._id === request.params.id);
  if (index === -1) return response.status(404).json({ message: 'Message not found.' });
  messages[index].read = true;
  writeMessages(messages);
  return response.json(messages[index]);
});

router.get('/notifications/:email', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  return response.json(readCollection('notifications.json').filter((notification) => notification.email === email));
});

router.patch('/notifications/:email/read', (request, response) => {
  const email = decodeURIComponent(request.params.email).toLowerCase();
  const notifications = readCollection('notifications.json').map((notification) => notification.email === email ? { ...notification, read: true } : notification);
  writeCollection('notifications.json', notifications);
  return response.json({ ok: true });
});

router.post('/contact', (request, response) => response.status(201).json({ message: 'Thanks, we will be in touch soon.', ...request.body }));

export default router;
