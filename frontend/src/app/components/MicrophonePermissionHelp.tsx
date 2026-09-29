import { MicOff, RotateCcw } from "lucide-react";

export function MicrophonePermissionHelp({ onRetry, disabled = false }: { onRetry: () => void; disabled?: boolean }) {
  return <div className="mic-permission-help" role="alert">
    <strong><MicOff size={19}/>Your microphone needs permission</strong>
    <p>A saved Block setting can stop the browser from asking again.</p>
    <ol>
      <li>Open the site controls beside the browser address.</li>
      <li>Set <b>Microphone</b> to <b>Allow</b>, then return here.</li>
      <li>Tap <b>Try microphone again</b>.</li>
    </ol>
    <p>If it is still blocked, check your device's microphone privacy settings. In an app preview, check the app's permissions or open Readlr in your browser.</p>
    <button disabled={disabled} onClick={onRetry}><RotateCcw size={17}/>Try microphone again</button>
  </div>;
}
