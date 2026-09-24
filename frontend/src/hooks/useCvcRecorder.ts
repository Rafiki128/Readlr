import { useEffect, useRef } from "react";
import { cvcHasVoice } from "../app/components/cvcContent";

export function useCvcRecorder() {
  const cancel = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  function stop() { generation.current++; cancel.current?.(); cancel.current = null; }
  useEffect(() => stop, []);
  async function capture(onTick:(remaining:number)=>void, beforeStart:()=>Promise<void>):Promise<Blob> {
    stop();
    const run = generation.current;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("This browser cannot record. Please try Chrome or Edge.");
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}});
    if (generation.current !== run || document.hidden) { stream.getTracks().forEach(track=>track.stop()); throw new DOMException("Stopped", "AbortError"); }
    return new Promise((resolve,reject)=> {
      let context:AudioContext | undefined;
      let recorder:MediaRecorder | undefined;
      let sampling:ReturnType<typeof setInterval> | undefined;
      let ending:ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      const chunks:BlobPart[] = [];
      const finish = (error?:Error, blob?:Blob) => {
        if (settled) return;
        settled = true;
        clearInterval(sampling); clearTimeout(ending);
        if (recorder) { recorder.onstop=null; recorder.ondataavailable=null; recorder.onerror=null; if(recorder.state!=="inactive") recorder.stop(); }
        stream.getTracks().forEach(track=>track.stop());
        void context?.close().catch(()=>{});
        cancel.current=null;
        error ? reject(error) : resolve(blob!);
      };
      cancel.current = ()=>finish(new DOMException("Stopped", "AbortError"));
      try {
        context = new AudioContext();
        const analyser = context.createAnalyser(); analyser.fftSize=1024;
        context.createMediaStreamSource(stream).connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        recorder = new MediaRecorder(stream);
        let peak=0, frames=0;
        recorder.ondataavailable=event=>{ if(event.data.size) chunks.push(event.data); };
        recorder.onerror=()=>finish(new Error("The microphone stopped. Let's try again."));
        recorder.onstop=()=> {
          const blob = new Blob(chunks,{type:recorder!.mimeType});
          cvcHasVoice(peak,frames,blob.size) ? finish(undefined,blob) : finish(new Error("I could not hear your voice. Let's try again!"));
        };
        void context.resume().then(async()=> {
          if(settled) return;
          // Permission and audio setup finish before the child's ready cue.
          await beforeStart();
          if(settled) return;
          recorder!.start();
          const start = Date.now(); onTick(4);
          sampling=setInterval(()=> {
            analyser.getFloatTimeDomainData(data);
            const rms=Math.sqrt(data.reduce((sum,sample)=>sum+sample*sample,0)/data.length);
            peak=Math.max(peak,rms); if(rms>=.018) frames++;
            onTick(Math.max(1,Math.ceil((4000-Date.now()+start)/1000)));
          },50);
          ending=setTimeout(()=>{ if(recorder?.state==="recording") recorder.stop(); },4000);
        }).catch(error=>finish(error instanceof Error ? error : new Error("Please allow the microphone and try again.")));
      } catch { finish(new Error("Please allow the microphone and try again.")); }
    });
  }
  return {capture,stop};
}
