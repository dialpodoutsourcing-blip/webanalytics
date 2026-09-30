import { expect,it } from "vitest";
import { matchTarget,normalizeCompetitors } from "@/features/geogrid/matching";
const results=[{rank_group:1,title:"Lotus Vet",place_id:"other",address:"1 Main"},{rank_group:3,title:"Lotus Veterinary",place_id:"target",address:"2 Main"}];
it("matches stable place identifiers before names",()=>{expect(matchTarget(results,{placeId:"target",name:"Lotus Vet",address:"2 Main"})).toMatchObject({rank:3,confidence:"EXACT"});expect(matchTarget(results,{placeId:"missing",name:"Lotus Vet",address:"1 Main"})).toBeNull();});
it("deduplicates competitors by identifier",()=>{expect(normalizeCompetitors([...results,results[0]])).toHaveLength(2);});
