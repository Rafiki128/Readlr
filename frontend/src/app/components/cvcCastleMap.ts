export const CASTLE_STOPS = Array.from({length:20}, (_,i) => ({x:50+Math.sin(i*Math.PI/2)*20,y:520+i*178}));
// Stops are positioned by their top edge; routes meet the opaque marker centre.
export const CASTLE_MARKER_CENTER = 40;

export function castleRoute(stopCount:number) {
  const count=Math.max(0,Math.min(20,Math.floor(stopCount)));
  if(!count) return "";
  return `M500 350 L500 ${520+CASTLE_MARKER_CENTER} ${CASTLE_STOPS.slice(1,count).map((p,i)=>`C${CASTLE_STOPS[i].x*10} ${CASTLE_STOPS[i].y+90+CASTLE_MARKER_CENTER} ${p.x*10} ${p.y-90+CASTLE_MARKER_CENTER} ${p.x*10} ${p.y+CASTLE_MARKER_CENTER}`).join(" ")}`;
}
