const fs = require('fs');
const file = 'src/services/propGrader.ts';
let code = fs.readFileSync(file, 'utf8');

const oldLogic = `            if (valueA !== null && valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                let statusDesc = 'In Progress';
                if (statusA.status === 'STATUS_FINAL' && statusB.status === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                    statusDesc = 'Final';
                } else {
                    if (m.metadata.optionA.gameId === m.metadata.optionB.gameId) {
                         statusDesc = statusA.detail || 'In Progress';
                    } else {
                         let farthest = statusA;
                         if (statusA.status === 'STATUS_FINAL') {
                             farthest = statusB;
                         } else if (statusB.status === 'STATUS_FINAL') {
                             farthest = statusA;
                         } else if (statusA.period !== undefined && statusB.period !== undefined) {
                             if (statusA.period < statusB.period) {
                                 farthest = statusA;
                             } else if (statusA.period > statusB.period) {
                                 farthest = statusB;
                             }
                         }
                         statusDesc = farthest.detail || 'In Progress';
                    }
                }
                
                batch.update(doc.ref, {
                    'awayTeam.score': valueA,
                    'homeTeam.score': valueB,
                    status: newStatus,
                    statusDesc: statusDesc
                });
                count++;
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', statusDesc: 'Final', homeTeam: { ...m.homeTeam, score: valueB }, awayTeam: { ...m.awayTeam, score: valueA } });
                }
            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {
                // If games have started by time but boxscore is not ready, update status to lock the prop
                batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });
                count++;
            }`;

const newLogic = `            if (valueA !== null || valueB !== null) {
                // Determine if both games are final
                const statusA = await fetchGameStatus(m.metadata.optionA);
                const statusB = await fetchGameStatus(m.metadata.optionB);
                
                let newStatus = 'STATUS_IN_PROGRESS';
                let statusDesc = 'In Progress';
                
                // If one game hasn't started, its status will be IN_PROGRESS or SCHEDULED (from fetchGameStatus default)
                // Let's ensure we only mark FINAL if BOTH are FINAL
                if (statusA.status === 'STATUS_FINAL' && statusB.status === 'STATUS_FINAL') {
                    newStatus = 'STATUS_FINAL';
                    statusDesc = 'Final';
                } else {
                    if (m.metadata.optionA.gameId === m.metadata.optionB.gameId) {
                         statusDesc = statusA.detail || 'In Progress';
                    } else {
                         let farthest = statusA;
                         if (statusA.status === 'STATUS_FINAL') {
                             farthest = statusB;
                         } else if (statusB.status === 'STATUS_FINAL') {
                             farthest = statusA;
                         } else if (statusA.period !== undefined && statusB.period !== undefined) {
                             if (statusA.period < statusB.period) {
                                 farthest = statusA;
                             } else if (statusA.period > statusB.period) {
                                 farthest = statusB;
                             }
                         }
                         statusDesc = farthest.detail || 'In Progress';
                    }
                }
                
                const updateData: any = {
                    status: newStatus,
                    statusDesc: statusDesc
                };
                
                let currentScoreA = m.awayTeam?.score || 0;
                let currentScoreB = m.homeTeam?.score || 0;
                
                if (valueA !== null) {
                    updateData['awayTeam.score'] = valueA;
                    currentScoreA = valueA;
                }
                if (valueB !== null) {
                    updateData['homeTeam.score'] = valueB;
                    currentScoreB = valueB;
                }
                
                batch.update(doc.ref, updateData);
                count++;
                if (newStatus === 'STATUS_FINAL') {
                    matchupsToGrade.push({ id: doc.id, ...m, status: 'STATUS_FINAL', statusDesc: 'Final', homeTeam: { ...m.homeTeam, score: currentScoreB }, awayTeam: { ...m.awayTeam, score: currentScoreA } });
                }
            } else if (m.startTime && Date.now() >= m.startTime && m.status === 'STATUS_SCHEDULED') {
                // If games have started by time but boxscore is not ready, update status to lock the prop
                batch.update(doc.ref, { status: 'STATUS_IN_PROGRESS' });
                count++;
            }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync(file, code);
