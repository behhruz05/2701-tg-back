// Telegram (GramJS) obyektlarini frontend uchun sodda JSON ga aylantiramiz.
// Eng muhimi: BigInteger id larni String ga o'tkazamiz.

function idStr(v) {
  if (v === undefined || v === null) return null;
  try {
    return String(v);
  } catch {
    return null;
  }
}

// Peer (User / Chat / Channel) id sini ajratib olish.
export function peerId(peer) {
  if (!peer) return null;
  if (peer.userId !== undefined) return idStr(peer.userId);
  if (peer.chatId !== undefined) return idStr(peer.chatId);
  if (peer.channelId !== undefined) return idStr(peer.channelId);
  return idStr(peer.id ?? peer);
}

// Media turini aniqlaymiz (rasm, video, ovoz, fayl...).
function mediaInfo(media) {
  if (!media) return null;
  const cls = media.className || '';
  if (cls === 'MessageMediaPhoto') return { kind: 'photo' };
  if (cls === 'MessageMediaDocument') {
    const doc = media.document;
    const attrs = doc?.attributes || [];
    let kind = 'document';
    let fileName = '';
    let duration = 0;
    for (const a of attrs) {
      const an = a.className || '';
      if (an === 'DocumentAttributeFilename') fileName = a.fileName || '';
      if (an === 'DocumentAttributeAudio') {
        kind = a.voice ? 'voice' : 'audio';
        duration = a.duration || 0;
      }
      if (an === 'DocumentAttributeVideo') {
        kind = a.roundMessage ? 'video_note' : 'video';
        duration = a.duration || 0;
      }
      if (an === 'DocumentAttributeSticker') kind = 'sticker';
      if (an === 'DocumentAttributeAnimated') kind = 'gif';
    }
    return {
      kind,
      fileName,
      duration,
      mimeType: doc?.mimeType || '',
      size: doc?.size ? String(doc.size) : '0',
    };
  }
  if (cls === 'MessageMediaGeo' || cls === 'MessageMediaGeoLive') {
    return { kind: 'location', lat: media.geo?.lat, lng: media.geo?.long };
  }
  if (cls === 'MessageMediaContact') {
    return {
      kind: 'contact',
      phone: media.phoneNumber,
      firstName: media.firstName,
      lastName: media.lastName,
    };
  }
  if (cls === 'MessageMediaPoll') return { kind: 'poll', question: media.poll?.question };
  return { kind: 'other', className: cls };
}

// Bitta xabarni serializatsiya qilamiz.
export function serializeMessage(msg) {
  if (!msg) return null;
  // Service xabarlar (kirdi/chiqdi) MessageService bo'ladi.
  const isService = msg.className === 'MessageService';

  const reactions =
    msg.reactions?.results?.map((r) => ({
      emoji: r.reaction?.emoticon || '',
      count: r.count || 0,
      chosen: !!r.chosenOrder || !!r.chosen,
    })) || [];

  return {
    id: msg.id,
    chatId: peerId(msg.peerId),
    senderId: idStr(msg.senderId) ?? peerId(msg.fromId),
    text: msg.message || '',
    date: msg.date ? msg.date * 1000 : null, // ms
    out: !!msg.out,
    editDate: msg.editDate ? msg.editDate * 1000 : null,
    replyToMsgId: msg.replyTo?.replyToMsgId || null,
    forwarded: !!msg.fwdFrom,
    pinned: !!msg.pinned,
    views: msg.views || 0,
    media: isService ? null : mediaInfo(msg.media),
    reactions,
    action: isService ? msg.action?.className || 'service' : null,
  };
}

// Bitta dialog (chat) ni serializatsiya qilamiz.
export function serializeDialog(d) {
  const entity = d.entity || {};
  return {
    id: idStr(d.id),
    name: d.title || d.name || '',
    isUser: !!d.isUser,
    isGroup: !!d.isGroup,
    isChannel: !!d.isChannel,
    unreadCount: d.unreadCount || 0,
    unreadMentions: d.unreadMentionsCount || 0,
    pinned: !!d.pinned,
    archived: !!d.archived,
    username: entity.username || '',
    verified: !!entity.verified,
    lastMessage: d.message ? serializeMessage(d.message) : null,
    date: d.date ? d.date * 1000 : null,
  };
}

// Foydalanuvchi (kontakt / sender) ni serializatsiya qilamiz.
export function serializeUser(u) {
  if (!u) return null;
  return {
    id: idStr(u.id),
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    username: u.username || '',
    phone: u.phone || '',
    bot: !!u.bot,
    premium: !!u.premium,
    verified: !!u.verified,
    status: u.status?.className || null,
  };
}
