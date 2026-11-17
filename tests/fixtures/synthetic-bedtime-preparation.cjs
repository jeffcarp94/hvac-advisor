// Synthetic evening and overnight weather. The two forecast periods are
// separated at 10 PM Central to isolate cooling preparation before heat.
module.exports={
 start:'2026-05-09T02:00:00Z',end:'2026-05-09T12:00:00Z',
 initial:{temperature:[72,72],rh:[45,45]},
 points:[
  {time:'2026-05-09T02:00:00Z',tOut:66,rh:35,wind:3,cloud:1,precip:'none'},
  {time:'2026-05-09T03:00:00Z',tOut:61,rh:40,wind:3,cloud:1,precip:'none'}
 ]
};
