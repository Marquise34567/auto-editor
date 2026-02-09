(async()=>{
  const origin = process.env.JOBS_ORIGIN || 'http://localhost:3001';
  try{
    const post = await fetch(origin + '/api/jobs', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ path: 'clip_1770177801901.mp4' }),
    });
    const json = await post.json();
    console.log('JOBID:' + json.jobId);

    try {
      const job = await (await fetch(`${origin}/api/jobs/${json.jobId}`)).json();
      console.log('JOB:' + JSON.stringify(job, null, 2));
    } catch (e) {
      console.error('GET failed', e);
    }

    const sresp = await fetch(`${origin}/api/jobs/${json.jobId}/events`);
    if(!sresp.ok){
      console.error('SSE fetch failed', sresp.status);
      return;
    }

    const reader = sresp.body.getReader();
    const decoder = new TextDecoder();
    const start = Date.now();
    console.log('--- SSE STREAM START (30s) ---');
    while(Date.now() - start < 30000){
      const { done, value } = await reader.read();
      if(done) break;
      process.stdout.write(decoder.decode(value));
    }
    console.log('\n--- SSE STREAM END ---');
  }catch(e){
    console.error('ERR', e);
    process.exitCode = 1;
  }
})();
