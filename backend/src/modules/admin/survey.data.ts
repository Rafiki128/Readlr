export const SURVEY_VERSION = 'student-feedback-5star-v1';
export const questions = [
  ['I like the character in Readlr.', 'Ganahan ko sa karakter sa Readlr.'],
  ['I like the games in Readlr.', 'Ganahan ko sa mga dula sa Readlr.'],
  ['I like the sounds and pronunciation activities.', 'Ganahan ko sa mga activity sa tingog ug paglitok.'],
  ['I like the reading activities.', 'Ganahan ko sa mga activity sa pagbasa.'],
  ['I like the pictures and stories.', 'Ganahan ko sa mga picture ug storya.'],
  ['I like the rewards and achievements.', 'Ganahan ko sa mga ganti ug achievement.'],
  ['The buttons and icons are easy to use.', 'Sayon ra gamiton ang mga button ug icon.'],
  ['The activities are easy to understand.', 'Sayon sabton ang mga activity.'],
  ['I can hear the sounds clearly.', 'Klaro ra nako madungog ang mga tingog.'],
  ['The activities are fun.', 'Lingaw ang mga activity.'],
  ['The activities help me learn new sounds and words.', 'Nakatabang ang mga activity nga makakat-on ko og bag-ong tingog ug pulong.'],
  ['I want to use Readlr again.', 'Gusto ko mogamit pag-usab sa Readlr.'],
  ['What do you like most in Readlr?', 'Unsa ang imong pinaka-ganahan sa Readlr?'],
  ['What was hard for you?', 'Unsa ang lisod para nimo?'],
].map(([en,ceb],i)=>({id:i+1,en,ceb,kind:i<12?'rating':'choice'}));
export const scale = [
  ['I do not like it','Dili ko ganahan'], ['A little','Diyutay lang'], ['Okay','Okay ra'],
  ['I like it','Ganahan ko'], ['I really like it','Ganahan kaayo ko'],
];
export const choices = {
  13: [['characters','Characters','Mga karakter'],['games','Games','Mga dula'],['sounds','Sounds','Mga tingog'],['reading','Reading activities','Mga activity sa pagbasa'],['pictures','Pictures and stories','Mga picture ug storya'],['rewards','Rewards','Mga ganti']],
  14: [['nothing','Nothing','Wala'],['games','Games','Mga dula'],['sounds','Sounds','Mga tingog'],['reading','Reading','Pagbasa'],['pictures','Pictures','Mga picture'],['rewards','Rewards','Mga ganti']],
};
export function validateSubmission(body: any) {
  if (!body || body.version!==SURVEY_VERSION || !['en','ceb'].includes(body.language) || typeof body.section!=='string' || !body.section.trim() || body.section.trim().length>80 || !Array.isArray(body.answers) || body.answers.length!==14) return false;
  return body.answers.every((answer: unknown,i:number)=> answer===null || (i<12 ? Number.isInteger(answer) && Number(answer)>=1 && Number(answer)<=5 : choices[(i+1) as 13|14].some(c=>c[0]===answer)));
}
