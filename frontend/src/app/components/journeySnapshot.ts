export interface JourneySnapshot { stage_number: number; completed: number; jewels: number }
export function mergeSnapshot(local: JourneySnapshot, remote: JourneySnapshot): JourneySnapshot {
  if (remote.stage_number !== local.stage_number || !Number.isInteger(remote.completed) || remote.completed < 0 || remote.completed > 20 ||
      !Number.isInteger(remote.jewels) || remote.jewels < 0 || remote.jewels > 3 ||
      (remote.stage_number === 2 && remote.jewels !== 0) ||
      (remote.stage_number === 3 && ((remote.completed < 19 && remote.jewels !== 0) || (remote.completed === 20) !== (remote.jewels === 3)))) return local;
  return {stage_number:local.stage_number, completed:Math.max(local.completed,remote.completed), jewels:Math.max(local.jewels,remote.jewels)};
}
export function contiguousCount(values:number[], max:number) {
  let count=0;
  while(count < max && values.includes(count+1)) count++;
  return count;
}
