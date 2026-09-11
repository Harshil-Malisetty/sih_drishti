import {describe,it,expect} from 'vitest';
import {createCitySeed} from '../src/data/demo/citySeed';
import {calculateScenario} from '../src/domain/planning';
import {nearestPoliceStation} from '../src/domain/emergencyAllocation';
import {POTHOLE,WATER,INFRASTRUCTURE,PROBLEM_BEATS,calculatePlanning,trafficRatio,distanceKm} from '../public/canvas-film/model.js';
import {SCENES,FPS} from '../public/canvas-film/timeline.js';

describe('source-grounded explainer calculations',()=>{
  it('uses the actual stored pothole and waterlogging series, not invented percentages',()=>{
    const seed=createCitySeed();
    for(const example of [POTHOLE,WATER]){
      const issue=seed.issues[example.id];
      expect(example.values).toEqual(issue.observations.map(o=>o.relativeSize));
      expect(example.days).toEqual(issue.observations.map(o=>o.day));
      expect(example.threshold).toBe(issue.interventionThreshold);
    }
  });
  it('keeps all additional condition-series values grounded in their own case',()=>{
    const seed=createCitySeed();
    INFRASTRUCTURE.filter(r=>r.id).forEach(r=>{
      expect(r.values).toEqual(seed.issues[r.id].observations.map(o=>o.relativeSize));
    });
    expect(INFRASTRUCTURE.find(r=>r.kind==='debris').values).toBeUndefined();
  });
  it.each([['3 days',.5],['2 weeks',.75],['8 weeks',1],['4 months',1.35]])('matches the implemented %s redistribution and delay formulas',(duration,multiplier)=>{
    const actual=calculateScenario(createCitySeed(),{roadSegmentId:'anna',duration},'film-test');
    const film=calculatePlanning(undefined,multiplier);
    for(const row of film.affected){
      const impact=actual.affected.find(r=>r.roadSegmentId===row.id);
      expect(row.additionalVehicles).toBe(impact.additionalVehicles);
      expect(row.saturation).toBeCloseTo(impact.saturation,12);
      expect(row.delayMinutes).toBe(impact.delayMinutes);
    }
  });
  it('makes the simple onscreen 129 → 45/43/41 example reproducible',()=>{
    const result=calculatePlanning();expect(result.displaced).toBe(129);expect(result.totalSpare).toBe(155);
    expect(result.affected.map(r=>r.additionalVehicles)).toEqual([45,43,41]);
    expect(result.affected[0].after).toBe(161);expect(result.affected[0].saturation*100).toBeCloseTo(94.705882,5);
  });
  it('keeps anomaly ratio separate from capacity saturation',()=>{
    expect(trafficRatio(184,60)).toBeCloseTo(3.0666667,6);expect(trafficRatio(60,60)).toBe(1);
    expect(trafficRatio(120,60)).toBe(2);expect(()=>trafficRatio(20,0)).toThrow();
    expect(trafficRatio(184,230)).not.toBe(trafficRatio(184,60));
  });
  it('matches geographic nearest-station calculation without inventing road ETA',()=>{
    const stations=[{id:'A',latitude:0,longitude:.01},{id:'B',latitude:0,longitude:.02}];
    const actual=nearestPoliceStation(stations,{latitude:0,longitude:0});
    expect(distanceKm([0,0],[0,.01])).toBeCloseTo(actual.distanceKm,10);
    expect(actual.station.id).toBe('A');expect(distanceKm([0,0],[0,.02])).toBeCloseTo(2.2238985,6);
  });
  it('gives each promised problem an explicit bounded visual beat',()=>{
    expect(PROBLEM_BEATS).toHaveLength(19);expect(new Set(PROBLEM_BEATS.map(p=>p.id)).size).toBe(19);
    for(const p of PROBLEM_BEATS){expect(p.end-p.start).toBeGreaterThanOrEqual(2);expect(SCENES.some(s=>p.start*FPS>=s.start&&p.end*FPS<=s.end)).toBe(true);}
    expect(INFRASTRUCTURE.map(r=>r.kind)).toEqual(['crossing','school','divider','sign','guardrail','debris']);
  });
});