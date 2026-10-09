import { STRATEGIC_GOAL, STRATEGIC_INDICATORS, PROGRAM_OBJECTIVES, DIRECTORATE_OBJECTIVES } from './strategic-objectives-data.js';
import './strategic-objectives.css';

function ObjectiveGroup({objective,level}) {
  return <section className={`strategic-group strategic-group-${objective.id}`} aria-labelledby={`${objective.id}-title`}>
    <div className="strategic-objective" tabIndex={0} aria-describedby={`${objective.id}-indicators`}>
      <h4 id={`${objective.id}-title`}><strong>{objective.code}</strong><span>{objective.title}</span></h4>
    </div>
    <div id={`${objective.id}-indicators`} className={`strategic-indicators strategic-indicators-${level}`}>
      {level === 'program' && objective.id !== 'sp6' ? <div className="strategic-indicator">{objective.indicators.map(indicator => <p key={indicator.code}><strong>{indicator.code}:</strong><span>{indicator.text}</span></p>)}</div> : objective.indicators.map(indicator => <div className="strategic-indicator" key={indicator.code}><p><strong>{indicator.code}</strong><span>{indicator.text}</span></p></div>)}
    </div>
  </section>;
}

export function StrategicObjectives() {
  return <div className="strategic-page">
    <section aria-labelledby="strategic-ministry-title" className="strategic-diagram">
      <h2 id="strategic-ministry-title" className="strategic-institution">Kementerian Perumahan dan Kawasan Permukiman</h2>
      <div className="strategic-goal strategic-goal-ministry"><h3><strong>SS-1:</strong><span>{STRATEGIC_GOAL}</span></h3><ul>{STRATEGIC_INDICATORS.map((text,i) => <li key={text}>IKSS-{i+1}: {text}</li>)}</ul></div>
      <h3 className="strategic-program">Program Perumahan dan Kawasan Permukiman</h3>
      <div className="strategic-grid strategic-grid-program">{PROGRAM_OBJECTIVES.map(objective => <ObjectiveGroup key={objective.id} objective={objective} level="program"/>)}</div>
    </section>
    <section aria-labelledby="strategic-directorate-title" className="strategic-diagram">
      <h2 id="strategic-directorate-title" className="strategic-institution">Direktorat Jenderal Perumahan Perdesaan</h2>
      <div className="strategic-goal strategic-goal-directorate"><h3>SS-1 {STRATEGIC_GOAL}</h3></div>
      <h3 className="strategic-program strategic-program-directorate">SP 04 Meningkatnya Hunian layak dan terjangkau di Wilayah Perdesaan</h3>
      <div className="strategic-grid strategic-grid-directorate">{DIRECTORATE_OBJECTIVES.map(objective => <ObjectiveGroup key={objective.id} objective={objective} level="directorate"/>)}</div>
    </section>
  </div>;
}
