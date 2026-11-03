// Disposable local database only. Does not load or connect to the supplied URI.
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {MongoClient,ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
const uri=replica.getUri('resusskills_browser_test');
const client=await new MongoClient(uri).connect(),db=client.db();
const professor=new ObjectId(),password=randomBytes(18).toString('base64url');
await db.collection('users').insertOne({_id:professor,name:'Professeur',lastName:'Démonstration',email:'professor-test@example.invalid',password:await bcrypt.hash(password,12),role:'professor',createdAt:new Date(),updatedAt:new Date()});
const phaseNames=['preTest','phase-1','phase-2','phase-3','phase-4','postTest'];
for(let i=0;i<62;i++){
 const userId=new ObjectId();await db.collection('users').insertOne({_id:userId,name:`Étudiant ${String(i+1).padStart(2,'0')}`,lastName:'Démonstration',email:`student-${i+1}@example.invalid`,role:'student',age:20+i%10,createdAt:new Date('2024-01-01')});
 if(i>57)continue;
 for(let rank=0;rank<(i%7===0?3:1);rank++){
  const _id=new ObjectId(),startedAt=new Date(Date.UTC(2024+i%3,i%12,1+rank)),completed=i%13!==0;
  const scores={preTest:0,phase1:0,phase2:0,phase3:0,phase4:0,postTest:0,total:0,percentage:0};
  const answers=[];
  for(let j=0;j<(completed?34:5);j++){const phase=j<10?'preTest':j>=26?'postTest':phaseNames[1+Math.floor((j-10)/4)],isCorrect=i===1?true:i===2?false:(i+j+rank)%3!==0,isSkipped=!isCorrect&&j%7===0; if(isCorrect){scores[phase.replace('-','')]++;scores.total++;}answers.push({attemptId:_id,questionId:`${phase}-${j}`,questionType:'mcq',phase,selectedOptionId:isSkipped?null:isCorrect?'a':'b',correctOptionId:'a',isCorrect,isSkipped,timeSpent:j%5===0?0:10+(i*j)%120,answeredAt:new Date(+startedAt+j*60000)});}
  scores.percentage=Math.round(scores.total/34*100);
  await db.collection('quizattempts').insertOne({_id,userId,status:completed?'completed':'in-progress',startedAt,completedAt:completed?new Date(+startedAt+7200000):null,scores,currentPhase:completed?'postTest':'preTest',currentQuestionIndex:0,createdAt:startedAt,timeSpentSeconds:0});
  await db.collection('useranswers').insertMany(answers);
 }
}
await db.collection('users').createIndex({email:1},{unique:true});await db.collection('useranswers').createIndex({attemptId:1,questionId:1},{unique:true});
await mkdir('.test-local',{recursive:true});await writeFile('.test-local/browser-account.json',JSON.stringify({email:'professor-test@example.invalid',password}));
console.log('Isolated test database ready: 63 accounts. Local app: http://localhost:3001');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3001'],{stdio:'inherit',env:{...process.env,MONGODB_URI:uri,AUTH_URL:'http://localhost:3001',NEXT_PUBLIC_APP_URL:'http://localhost:3001',NEXT_DIST_DIR:'.next-test'}});
async function close(){child.kill();await client.close();await replica.stop();process.exit();}
process.on('SIGINT',close);process.on('SIGTERM',close);child.on('exit',close);
