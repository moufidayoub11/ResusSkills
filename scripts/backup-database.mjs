import {MongoClient,BSON} from 'mongodb';
import {gzipSync} from 'node:zlib';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const destination=process.argv[2];
if(!destination)throw new Error('An explicit backup directory is required.');
const client=await new MongoClient(process.env.MONGODB_URI).connect();
try{
 const db=client.db(),names=(await db.listCollections({},{nameOnly:true}).toArray()).map(c=>c.name);
 const session=client.startSession(),collections={};
 try{await session.withTransaction(async()=>{for(const name of names)collections[name]=await db.collection(name).find({},{session}).toArray();},{readConcern:{level:'snapshot'}});}finally{await session.endSession();}
 const indexes={};for(const name of names)indexes[name]=await db.collection(name).listIndexes().toArray();
 const backup={createdAt:new Date().toISOString(),database:db.databaseName,collections,indexes};
 await mkdir(resolve(destination),{recursive:true});const path=join(resolve(destination),`resusskills-${new Date().toISOString().replace(/[:.]/g,'-')}.ejson.gz`);
 await writeFile(path,gzipSync(JSON.stringify(BSON.EJSON.serialize(backup,{relaxed:false}))),{mode:0o600});
 console.log(JSON.stringify({backup:path,collections:names.length,documents:Object.values(collections).reduce((n,docs)=>n+docs.length,0)}));
}finally{await client.close();}
