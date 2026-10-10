export const enhancementEn = {
  listen: 'Listen', stopReading: 'Stop reading aloud', readReply: 'Read reply aloud', startVoiceInput: 'Start voice input', stopVoiceInput: 'Stop voice input', sendMessage: 'Send message', autoReadOn: 'Auto-read replies: on', autoReadOff: 'Auto-read replies: off',
  conversationLanguage: 'Conversation questions', microphoneLanguage: 'Microphone language',
  replyLanguageHelp: 'Replies follow the language of your message. Previous advice stays unchanged.',
  restoredChatHelp: 'This transcript is saved on this device. Server conversation context may have been lost after a restart; it cannot be verified here.',
  expiredChatHelp: 'The server reported that this session is unavailable. Your saved transcript is retained. Start a new chat to continue.',
  localTaxonomyHelp: 'Topic names use a local reference list. Backend taxonomy metadata is unavailable.',
  newDiagnosis: 'New Diagnosis', newDiagnosisTitle: 'Start a new diagnosis?',
  newDiagnosisHelp: 'Replace the current workspace and cancel recording or analysis? Your saved diagnosis history will remain.',
  activityHelp: 'Activity shows your account events. Detailed Voice, Leaf and Pest records are listed separately below; Treatment conversations are in Treatment History.',
  voiceWorkspaceHelp: 'Your current diagnosis is saved on this device. Voice recognition remains Sinhala, independently of the interface language.',
  chatFailed: 'Could not reach the treatment advisor. Your message is saved; please try again.',
  knownPest: 'Known pest', verifyPest: 'Needs verification', confidence: 'confidence', similarity: 'similarity', acceptable: 'Acceptable', betterImage: 'Needs better image',
}
export const enhancementSi: Record<keyof typeof enhancementEn, string> = {
  listen: 'සවන් දෙන්න', stopReading: 'කියවීම නවත්වන්න', readReply: 'පිළිතුර කියවන්න', startVoiceInput: 'හඬ පටිගත කිරීම අරඹන්න', stopVoiceInput: 'හඬ පටිගත කිරීම නවත්වන්න', sendMessage: 'පණිවිඩය යවන්න', autoReadOn: 'ස්වයංක්‍රීය කියවීම: සක්‍රියයි', autoReadOff: 'ස්වයංක්‍රීය කියවීම: අක්‍රියයි',
  conversationLanguage: 'සංවාද ප්‍රශ්න භාෂාව', microphoneLanguage: 'මයික්‍රෆෝන භාෂාව',
  replyLanguageHelp: 'පිළිතුරු ඔබේ පණිවිඩයේ භාෂාව අනුව ලැබේ. පෙර උපදෙස් වෙනස් නොවේ.',
  restoredChatHelp: 'මෙම සංවාදය මෙම උපාංගයේ සුරැකී ඇත. සේවාදායකය නැවත ආරම්භ වූ පසු සංවාද මතකය නැති වී තිබිය හැක; මෙතැනින් එය තහවුරු කළ නොහැක.',
  expiredChatHelp: 'මෙම සැසිය නොමැති බව සේවාදායකය දන්වා ඇත. සුරැකි සංවාදය පවතී. ඉදිරියට යාමට නව සංවාදයක් අරඹන්න.',
  localTaxonomyHelp: 'මාතෘකා නම් සඳහා දේශීය නාම ලැයිස්තුවක් භාවිත වේ. සේවාදායකයේ නාම දත්ත නොමැත.',
  newDiagnosis: 'නව රෝග විනිශ්චය', newDiagnosisTitle: 'නව රෝග විනිශ්චයක් අරඹන්නද?',
  newDiagnosisHelp: 'වත්මන් ප්‍රතිඵල ඉවත් කර පටිගත කිරීම හෝ විශ්ලේෂණය නවත්වන්නද? සුරැකි රෝග විනිශ්චය ඉතිහාසය පවතී.',
  activityHelp: 'ක්‍රියාකාරකම් ඔබේ ගිණුමේ සිදුවීම් පෙන්වයි. හඬ, කොළ සහ පළිබෝධ විස්තර පහතින් වෙන වෙනම පෙන්වයි. ප්‍රතිකාර සංවාද ප්‍රතිකාර ඉතිහාසයේ ඇත.',
  voiceWorkspaceHelp: 'වත්මන් රෝග විනිශ්චය මෙම උපාංගයේ සුරැකේ. අතුරුමුහුණත් භාෂාව වෙනස් කළත් හඬ හඳුනාගැනීම සිංහලෙන් සිදු වේ.',
  chatFailed: 'ප්‍රතිකාර උපදේශක වෙත සම්බන්ධ විය නොහැක. ඔබේ පණිවිඩය සුරැකී ඇත; නැවත උත්සාහ කරන්න.',
  knownPest: 'හඳුනාගත් පළිබෝධය', verifyPest: 'තහවුරු කළ යුතුය', confidence: 'විශ්වාසය', similarity: 'සමානතාව', acceptable: 'සුදුසුයි', betterImage: 'වඩා හොඳ රූපයක් අවශ්‍යයි',
}

export const enhancementSourceKeys: Record<string, string> = {
  Listen: 'listen', Stop: 'stopReading', 'Read reply aloud': 'readReply', 'Stop reading aloud': 'stopReading',
  'Start voice input': 'startVoiceInput', 'Stop voice input': 'stopVoiceInput', 'Voice input language': 'microphoneLanguage',
  'Send message': 'sendMessage', 'Treatment Advisor': 'treatment', 'Loading…': 'loading',
  'Auto-read replies: on': 'autoReadOn', 'Auto-read replies: off': 'autoReadOff',
}
