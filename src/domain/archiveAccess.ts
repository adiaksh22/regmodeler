export class ArchiveRateLimitError extends Error{
 readonly retryAfter:number;
 constructor(seconds:number){
  const delay=Number.isInteger(seconds)&&seconds>=1&&seconds<=86400?seconds:60;
  const wait=delay<=60?'about a minute':delay<3600?`about ${Math.ceil(delay/60)} minutes`:`about ${Math.ceil(delay/3600)} hours`;
  super(`Archived PDF access is temporarily limited. Try again in ${wait}, or use the official source link.`);
  this.retryAfter=delay;
 }
}
