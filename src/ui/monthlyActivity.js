import { getMonthlyActivity } from '../core/progress/monthlyActivity.js';
export function renderMonthlyActivity(container,sessions) {
    if (!container) return;
    const summary=getMonthlyActivity(sessions);
    const section=document.createElement('section');section.className='progress-insight monthly-progress';
    const heading=document.createElement('div');heading.className='insight-heading';
    const label=document.createElement('span');label.className='dashboard-eyebrow';label.textContent='CONSISTENCY OVER TIME';
    const title=document.createElement('h3');title.textContent='28 วันที่ผ่านมา';heading.append(label,title);
    const description=document.createElement('p');description.className='monthly-summary';description.textContent=`${summary.workouts} เซสชัน · เคลื่อนไหว ${summary.activeDays} จาก 28 วัน`;
    const chart=document.createElement('div');chart.className='monthly-chart';chart.setAttribute('role','list');chart.setAttribute('aria-label','จำนวนเซสชันรายวันใน 28 วันที่ผ่านมา');
    const maximum=Math.max(1,...summary.days.map(day=>day.workouts));
    summary.days.forEach(day=>{
        const bar=document.createElement('div');bar.className='monthly-day';bar.setAttribute('role','listitem');
        const text=`${day.date}: ${day.workouts} เซสชัน, ${day.repetitions} ครั้ง`;
        bar.setAttribute('aria-label',text);bar.title=text;
        const fill=document.createElement('i');fill.style.height=`${day.workouts/maximum*100}%`;bar.append(fill);chart.append(bar);
    });
    const axis=document.createElement('div');axis.className='monthly-axis';
    for(const date of [summary.days[0].date,summary.days[27].date]) {const text=document.createElement('span');text.textContent=new Date(date+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});axis.append(text);}
    section.append(heading,description,chart,axis);container.replaceChildren(section);
}
