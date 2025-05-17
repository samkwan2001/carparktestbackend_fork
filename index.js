// const charger_IPV4 = "192.168.0.199";//<<<<<<<<<<
// const charger_IPV4 = "192.168.137.7";//<<<<<<<<<<
// const charger_IPV4 = "192.168.4.1";//<<<<<<<<<<
const express = require('express');
const mongodb = require('mongodb');
const {ObjectId} = require('mongodb');
const MongoClient = mongodb.MongoClient;
const app = express();
const port = 7000;
const cors = require("cors");
var fs = require('fs');
const { clearInterval } = require('timers');
const { set } = require('mongoose');
// const { Promise } = require('mongoose');
let predicted_moved_time=0;
// app.use(cors());
app.use(cors({
  origin: [
    'https://carparktest3frontend.vercel.app', // 換成你Vercel前端網址
    'http://localhost:3000', // 測試用
    'http://192.168.31.18:3000', // 測試用
    'http://192.168.137.1:3000', // 測試用
  ],
  // methods:['GET','POST'],
  credentials: true
}));
// 使用JSON中間件
app.use(express.json());

// 資料庫連接資訊
const url = 'mongodb://localhost:27017/';
// const url = process.env.MONGODB_URI;

const dbName = 'carpark';
const collectionName = 'carparkcollection';

let db;
let collection;

const FirstTime = 0;
const InQueue = 1;
const InUse = 2;
const Finish = 3;
const not_this_user = 4;

let timer = setInterval(async () => {
  clearInterval(timer);
}, 0);
function clearIntervals(Intervals=[]){
  for(let i = 0;i<Intervals.length;i++){
    if(!Intervals[i].destroyed){
      clearInterval(Intervals[i]);
    }
  }
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function millis_to_time_String(durationInMillis) {

  let millis = durationInMillis % 1000;
  let second = (durationInMillis / 1000) % 60;
  let minute = (durationInMillis / (1000 * 60)) //% 60;
  let hour = (durationInMillis / (1000 * 60 * 60));
  let time = `${Math.floor(hour)}小時${Math.floor(minute)}分鐘 ${Math.floor(second)}.${millis}秒`; //${Math.floor(millis)}`;
  return time
}
var dateFromObjectId = function (objectId) {
	return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
};
function find_symbol(obj,symbol){
  const syms = Object.getOwnPropertySymbols(obj)
  for(let i=0;i<syms.length;i++){
    if(`Symbol(${symbol})`==syms[i].toString())
      return syms[i];
  }
  return void 0;
}
// 連接資料庫
async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(url, { useUnifiedTopology: true });
    db = client.db(dbName);
    collection = db.collection(collectionName);
    console.log("成功連接到 MongoDB!");
  } catch (error) {
    console.error("連接到 MongoDB 失敗:", error);
    process.exit(1);
  }
}

let admin_debug_res=void 0;
function reload_admin(_id=void 0){
  if(admin_debug_res){
    admin_debug_res.write("event: message\n");
    admin_debug_res.write("data:" + String(_id) + "\n\n");
  }
}
let clients=[];
function reload_all_client(exception=void 0,_id=void 0) {
  console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
  let count=0;
  clients.forEach(async(client) => {
    // console.log(client)
    if(!client["res"].destroyed){
      // console.log(client["_id"])
      console.log("reload client"+client["async_id_symbol"],client["_id"])
      if(client["_id"]=="undefined")return;
      if(_id!=void 0&&client["_id"]!=_id)return;
      client["res"].write("event: message\n");
      client["res"].write("data:" + "reload" + "\n\n");
      // client["res"].write("exception:" + exception + "\n\n");
      count++;
    }
  });
  console.log("reloaded "+count);
  reload_admin()
  return count;
}
function send_to_client(event,data,_id=void 0) {
  console.log("rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
  let count=0;
  clients.forEach(async(client) => {
    // console.log(client)
    if(!client["res"].destroyed){
      // console.log(client["_id"])
      console.log("sent client",client["async_id_symbol"],client["_id"],":", {event:event},{data:data})
      if(client["_id"]=="undefined")return;
      if(_id!=void 0&&client["_id"]!=_id)return;
      client["res"].write(`event: ${event}\n`);
      client["res"].write(`data: ${data}\n\n`);
      // client["res"].write("exception:" + exception + "\n\n");
      count++;
    }
  });
  console.log("sent "+count);
  reload_admin()
  return count;
}
let last_queue_shift=0;
app.get('/events', (req, res) => {console.log("get /events :"+req.url);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  let urlparams = new URLSearchParams(req.url.split("?")[1]);
  console.log(urlparams);
  console.log(urlparams.get("_id") != '"undefined"');
  console.log(`${urlparams.get("_id")}!=${'"undefined"'}`);
  console.log("---------------------------------------")
  if (urlparams.get("_id")&&urlparams.get("_id") != '"undefined"') {
    query = { _id: new mongodb.ObjectId(urlparams.get("_id").replaceAll("\"", "")) };
  }
  async_id_symbol=res.req.client[find_symbol(res.req.client,"async_id_symbol")]
  console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
  const user_agent=String(res.req[find_symbol(res.req,"kHeaders")]["user-agent"])
  /**/ if(user_agent.indexOf("Edg")>=0)console.log("Edge");
  else if(user_agent.indexOf("Firefox")>=0)console.log("Firefox");
  else if(user_agent.indexOf("Chrome")>=0)console.log("Chrome");
  console.log(async_id_symbol)
  clients.push({"_id":urlparams.get("_id").replaceAll("\"", ""),"async_id_symbol" : async_id_symbol, "res": res});
  console.log(({"_id":urlparams.get("_id").replaceAll("\"", ""),"async_id_symbol" : async_id_symbol}));
  for(let i=0; i<clients.length;i++){
    if(clients[i].res.destroyed)
      clients.splice(i,1);
  }
  console.log(clients.length);
  fs.writeFile('.count.json', String(clients.length), 'utf8',()=>{});
  const _id=urlparams.get("_id").replaceAll("\"", "")
  req.on("close",async()=> {
    console.log("closeclclclclclclclclclclclclclclcl");
    for(let i=0; i<clients.length;i++){
      if(clients[i].res.destroyed)
        clients.splice(i,1);
    }
    console.log(clients.length);
    fs.writeFile('.count.json', String(clients.length), 'utf8',()=>{});
    console.log(async_id_symbol);
    reload_admin();
    console.log("reload_admin");
    if(_id=="undefined")return;
    const limit = 1
    let sort = { "start time": -1 }
    const crr_cursor = collection.find(
      {
        "_id": new ObjectId(_id),
      }, { sort, limit }
    )
    const crr_rows = await crr_cursor.toArray()
    console.log("close_rows")
    console.log(crr_rows)
    const crr_user = crr_rows[0]
    if(
      /**/crr_user/**/                  !==void 0
      &&  crr_user["Parking Space Num"] !==void 0
      &&  crr_user["charge duration"]   ===void 0
      &&  crr_user["start time"]        ===void 0
    ){
      console.log("deletedeletedeletedeletedeletedeletedeletedeletedeletedeletedeletedeletedeletedelete")
      console.log(async_id_symbol);
      reload_admin(_id);
      collection.deleteOne({"_id": new ObjectId(_id)});
    }else{
      console.log("no delete")
      if(crr_user)
        console.log(`
        ${/**/crr_user/**/                  !==void 0}
        &&  ${crr_user["Parking Space Num"] !==void 0}
        &&  ${crr_user["charge duration"]   ===void 0}
        &&  ${crr_user["start time"]        ===void 0}
        `)
    }
  })
  reload_admin()
  // res.write("event: message\n");
  // res.write("data:" + "reload" + "\n\n");
  if(Date.now() - last_queue_shift < 1000){
    // reload_all_client()
      res.write("event: message\n");
      res.write("data:" + "reload" + "\n\n");
  }
});
app.get('/admin_debug_events', (req, res) => {console.log("get /admin_debug_events :"+req.url);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  admin_debug_res=res;
});
app.get("/admin_debug_fetch",async(req,res)=>{console.log("get /admin_debug_fetch :"+req.url);
  const rows = await collection.find({}).toArray();
  const results=[]
  
  
  
    rows.forEach((row)=>{
      // console.log(clients)
      let client=clients.filter((client)=>{
        // console.log(client._id)
        // console.log(String(row._id))
        // console.log(client._id==String(row._id))
        if(client._id==String(row._id))
        return client
      })
      // console.log(client)
      const result = {};
      let key;
      
      for (key in row) {
        if(row.hasOwnProperty(key)){
          // console.log("appendedapapapapapapapapapapapapapapapapapapapapapap"+key)
          result[key] = row[key];
        }
      }
      Object.keys(client).forEach(
        (key,index)=>{
          console.log(key,index,);
          client=client[key]}
        )
      for (key in client) {
        if(key !="res"&&client.hasOwnProperty(key)){
          // console.log("appendedapapapapapapapapapapapapapapapapapapapapapap"+key)
          result[key] = client[key];
        }
      }
      
      
      results.push(result);
    });
      // user have no id
  clients.forEach((client)=>{
    if(!client.hasOwnProperty("_id")||client["_id"]!=="undefined"){return;}
    const result = {};
    let key;
    for (key in client) {
      if(key !="res"&&client.hasOwnProperty(key)){
        // console.log("appendedapapapapapapapapapapapapapapapapapapapapapap"+key)
        result[key] = client[key];
      }
    }
    results.push(result);
  })
  
  
  
  res.send(JSON.stringify(results))
})
// const msg_msgNtime=[]
let last_event_data={}
let index_loc_res=void 0;
app.get("/index_pub/event", (req, res)=>{console.log(req.url);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  index_loc_res=res;
  send_to_index_loc(last_event_data["event"],last_event_data["data"])
})
function send_to_index_loc(event,data){
  let success=false;
  if(index_loc_res!==void 0&&!index_loc_res.destroyed){
    index_loc_res.write("event: "+event+"\n");
    index_loc_res.write("data:" + data + "\n\n");
    success=true;
  }
  // else {
    // setTimeout(send_to_index_loc,10,(event,data));
    last_event_data["event"]=event;
    last_event_data["data"] =data;
  // }
  console.log(`send_to_index_loc(${event},${data})==${success}`)
};
let index_loc_msg_rev_time=0;
let need_wait=0;
app.get("/index_loc/push", (req, res)=>{const log=true;
  console.log('get"/index_loc/push"')
  if (log) console.log('app.get("/index_loc/push")' + req.url);
  if (log) console.log('app.get("/index_loc/push")' + decodeURI(req.url));
  // if(log)console.log(req);
  var params = new URLSearchParams(req.url.split("?")[1]);
  if (log) console.log(params);
  if(params.get("need_wait")!==void 0){
    need_wait=parseInt(params.get("need_wait"));
    console.log({"need_wait":need_wait});
    index_loc_msg_rev_time=Date.now();
    console.log({"index_loc/push":{"index_loc_msg_rev_time":index_loc_msg_rev_time}});
  }
  res.send("OK");
})
app.get("/admin_debug",(req,res)=>{console.log("get /admin_debug :"+req.url);
  res.send(`<!--html-->
    
                        <!DOCTYPE html>
                          <html lang="en">
                          <head>
                              <meta charset="UTF-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1.0">
                              <title>Admin Debug</title>
                              <style>
                                  body {
                                      font-family: Arial, sans-serif;
                                      margin: 20px;
                                      background-color: #f4f4f4;
                                  }
                                  table {
                                      width: 100%;
                                      border-collapse: collapse;
                                      margin-top: 20px;
                                  }
                                  th, td {
                                      padding: 10px;
                                      border: 1px solid #ccc;
                                      text-align: left;
                                  }
                                  th {
                                      background-color: #007bff;
                                      color: white;
                                  }
                                  //tr:nth-child(even) {
                                  //    background-color: #f9f9f9;
                                  //}
                                  .highlight {
                                      background-color: #90ee90; /* Light green */
                                  }
                                  .highlight-red {
                                      background-color: #ffcccb; /* Light red */
                                  }
                              </style>
                          </head>
                          <body>
                              <h1>Admin Debug - Parking Data</h1>
                              <table id="parkingData">
                                  <thead>
                                      <!-- <tr>
                                          <th>ID</th>
                                          <th>Parking Space Num</th>
                                          <th>Charge Duration</th>
                                          <th>Start Time</th>
                                      </tr> -->
                                  </thead>
                                  <tbody>
                                      <!-- Data will be inserted here -->
                                  </tbody>
                              </table>
                              <div id="values"><div>

                              <script>
                                <!--js -->
                                  const values=document.getElementById("values");
                                  function sleep(ms) {
                                      return new Promise(resolve => setTimeout(resolve, ms));
                                  }
                                  
                                  let last_id=void 0;
                                  async function fetchData(event=void 0) {
                                    console.log(event);
                                    //event may:
                                    //message { target: EventSource, isTrusted: true, data: "6810fa1ac9187b0762435028", origin: "http://localhost:7000", lastEventId: "", ports: Restricted, srcElement: EventSource, currentTarget: EventSource, eventPhase: 2, bubbles: false, … }
                                    //message { target: EventSource, isTrusted: true, data: "undefined", origin: "http://localhost:7000", lastEventId: "", ports: Restricted, srcElement: EventSource, currentTarget: EventSource, eventPhase: 2, bubbles: false, … }
                                    
                                    const response = await fetch('/admin_debug_fetch');
                                    const data = await response.json();
                                    const id_data = {};
                                    data.forEach((value, index) => {
                                      id_data[value["_id"]] = value;
                                    })
                                    const tbody = document.getElementById('parkingData').querySelector('tbody');
                                    const thead = document.getElementById('parkingData').querySelector('thead');
                                    let tkeys=[]
                                    //const model_row = document.createElement('tr');
                                    thead.innerHTML = '';
                                    if(data.length > 0) {
                                      const tr = document.createElement('tr');
                                      for(let i = 0;i<data.length;i++)
                                        Object.keys(data[i]).forEach(key => {
                                          const th=document.createElement("th");
                                          //console.log(key);
                                          if(tkeys.indexOf(key) == -1){
                                            th.id=key;
                                            th.textContent=key;
                                            tr.appendChild(th); 
                                            tkeys.push(key);
                                          }
                                        });
                                      thead.appendChild(tr);
                                    }
                                    console.log(tkeys);
                                    // Get the ID from the event message, if any
                                    const highlightedId = (event&&event.data!="undefined") ? event.data : (last_id?last_id:null);
                                    // Clear the table body while preserving the highlighted row
                                    const rowsToKeep = highlightedId ? data.filter(row => row._id === highlightedId) : [];
                                    if(event&&event.data=="undefined"){}//await sleep(500);}
                                    else if(event)last_id = event.data;
                                    
                                    // 獲取當前顯示的行的 _id
                                    const existingIds = Array.from(tbody.querySelectorAll('tr')).map(row => row.cells[0].textContent);
                                    //tbody.innerHTML = '';
                                    // 比對新資料，僅顯示新加入的行為綠色
                                    //const newRows = data.filter(row => !existingIds.includes(row._id));
                                    //let newRows = data.filter(row => !Array(tbody.querySelectorAll('tr')).includes(row));
                                    let newRows=[];
                                    let missingRows=[]
                                    let changedRows=[];
                                    data.forEach(row => {
                                      if(!document.getElementById(row._id)){
                                        newRows.push(row);
                                        console.log("newRow");
                                        console.log(row)
                                      }
                                    });
                                    
                                    
                                    const newIds = data.map(row => row._id);
                                    // 找出不見的資料
        const missingIds = existingIds.filter(id => !newIds.includes(id));
        if (missingIds.length > 0) {
            console.log('不見的資料                    :', missingIds);
        }
                                    //console.log(existingIds);
                                    missingIds.forEach( id => {
                                      
                                          row={}
                                          tkeys.forEach(key => {
                                            to_index=document.getElementById(key+"("+id+")").textContent
                                            console.log(to_index);
                                            row[key] = eval("'" + to_index + "'");
                                          })
                                          missingRows.push(row);
                                    })
                                    
                                    
                                    
                                    // 輸出新的資料
                                    if (newRows.length > 0) {
                                        console.log('新的資料:', newRows);
                                    }
                                    // 輸出不見的資料
                                    if (missingRows.length > 0) {
                                        console.log('不見的資料:', missingRows);
                                    }
                                  
                                    existingIds.forEach(id => {
                                      tkeys.forEach(key => {
                                        td=document.getElementById(key+"("+id+")")
                                        if(!td){
                                          td = document.createElement('td');
                                          td.id=key+"("+id+")";
                                          document.getElementById(id).appendChild(td);
                                        }
                                        to_index=td.textContent
                                        
                                        //console.log(to_index);
                                        if(id_data[id]){
                                          if(td.class="empty"&&id_data[id][key]===void 0)return;
                                          //matchs.push(id_data[id][key] == eval("'" + to_index + "'"));
                                          //console.log(id_data[id][key] +"=="+ eval("'" + to_index + "'"));
                                          const box = document.getElementById(key+"("+id+")")
                                          if(id_data[id][key]!==void 0){
                                            box.textContent=String(id_data[id][key]);
                                            box.style.display="";
                                          }
                                          else {
                                            box.class="empty"
                                          }
                                          if(
                                            id_data[id][key] != eval("'" + to_index + "'")
                                            && (
                                              String(id_data[id][key]).length != String(eval("'" + to_index + "'")).length
                                              ||String(id_data[id][key]) != String(eval("'" + to_index + "'"))
                                            )
                                          ){
                                            box.classList.add('highlight'); // 新行標記為綠色
                                            setTimeout(() => {
                                                box.classList.remove('highlight');
                                            }, 1000); // 1秒後移除綠色標記
                                          }
                                        }
                                      })
                                    })
                                    
                                    
          function add_row(_tr,_id){console.log("_tr.classList"+_tr.classList);
            // 插入到適當的位置
            if (tbody.children.length === 0) {
                tbody.appendChild(_tr); // 如果表格是空的，直接添加
            } else {
                // 找到正確的插入位置
                let inserted = false;
                console.log("tbody.children.length="+tbody.children.length);
                for (let i = 0; i < tbody.children.length; i++) {
                    const existingId = tbody.children[i].cells[0].textContent;
                    console.log(i+":"+(_id +"<"+ existingId));
                    if (parseInt(_id, 16) < parseInt(existingId, 16)) {
                        tbody.insertBefore(_tr, tbody.children[i]);
                        inserted = true;
                        break;
                    }
                }
                if (!inserted) {
                    tbody.appendChild(_tr); // 如果沒有找到合適的位置，則添加到最後
                }
            }
          }
                                    
                                    // Add the highlighted row (if any) first
                                    missingRows.forEach((row) => {
                                      tr = document.getElementById(row._id);
                                        //tbody.appendChild(tr);
                                        add_row(tr, row._id);
                                        tr.classList.add('highlight-red'); // 新行標記為紅色
                                        setTimeout(() => {
                                            tr.remove()
                                            fetchData()
                                        }, 500); // 0.5秒後移除紅色標記
                                    });
                                    // Sort the data by hex value of _id
                                    newRows = newRows.sort((a, b) => {
                                        return parseInt(a._id, 16) - parseInt(b._id, 16);
                                    });
                                    // 添加新行並標記為綠色
                                    newRows.forEach((row) => {
                                        let tr = document.getElementById(row._id);
                                        if(!tr){
                                          tr = document.createElement('tr');
                                          tr.id=row._id;
                                        }
                                        tkeys.forEach((key) => {
                                          td = document.createElement("td");
                                          td.id=key+"("+row._id+")";
                                          if(row[key]!==void 0)
                                            td.textContent=row[key];
                                          else
                                            td.class="empty"
                                          
                                        
                                        
                                          tr.appendChild(td);
                                        })
                                        tr.classList.add('highlight'); // 新行標記為綠色
            //// 插入到適當的位置
            add_row(tr,row._id);
            //if (tbody.children.length === 0) {
            //    tbody.appendChild(tr); // 如果表格是空的，直接添加
            //} else {
            //    // 找到正確的插入位置
            //    let inserted = false;
            //    console.log("tbody.children.length="+tbody.children.length);
            //    for (let i = 0; i < tbody.children.length; i++) {
            //        const existingId = tbody.children[i].cells[0].textContent;
            //        console.log(i+":"+(row._id +"<"+ existingId));
            //        if (parseInt(row._id, 16) < parseInt(existingId, 16)) {
            //            tbody.insertBefore(tr, tbody.children[i]);
            //            inserted = true;
            //            break;
            //        }
            //    }
            //    if (!inserted) {
            //        tbody.appendChild(tr); // 如果沒有找到合適的位置，則添加到最後
            //    }
            //}
                                        setTimeout(() => {
                                            tr.classList.remove('highlight');
                                        }, 1000); // 1秒後移除綠色標記
                                    });
                                  }
                                  eventSource = new EventSource("/admin_debug_events");
                                  eventSource.onmessage = fetchData;
                                  fetchData();
                              <!-- !js -->
                              </script>
                          </body>
                          </html>
    <!--!html-->`);
}); 
app.get("/qr",(req,res)=>{
  res.send(`<div id=\"qr-code\"></div>
    <script src=\"https://cdn.jsdelivr.net/npm/qrcodejs2\"></script>
    <p>{{payload}}</p>
    <script>
            var protocol = location.protocol;
            var slashes = protocol.concat(\"//\");
  //         var host = slashes.concat(window.location.host);
  //         // or as you probably should do
  //         var host = location.protocol.concat(\"//\").concat(window.location.host);
  //         // the above is the same as origin, e.g. \"https://stackoverflow.com\"
  //         var host = window.location.origin;
  // // 生成 QR code
  //         const url = host+\"/car/{{payload}}\"; // 更換為您的停車場網站 URL
  //         new QRCode(document.getElementById(\"qr-code\"), url);
  // </script>
  `,
  )
})



// 主路由處理查詢請求
app.get('/', async (req, res) => {const log=false;
  console.log('get"/"');
  try {
    let output=[];
    // const FirstTime = 0;
    // const InQueue = 1;
    // const InUse = 2;
    // const Finish = 3;
    // const not_this_user = 4;
    // 創建基本查詢對象
    let query = {};
    let sort = {};
    let limit = 0;
    let urlparams = new URLSearchParams(req.url.split("?")[1]);
    console.log(urlparams);
    console.log(urlparams.get("_id") != '"undefined"');
    console.log(`${urlparams.get("_id")}!=${'"undefined"'}`);
    console.log("---------------------------------------")
    let this_user = undefined;
    if (urlparams.get("_id") != '"undefined"') {
      query = { _id: new mongodb.ObjectId(urlparams.get("_id").replaceAll("\"", "")) };
      console.log("query")
      console.log(query);
      // 執行查詢
      let cursor = collection.find(query).sort(sort);
      if (limit > 0) {
        cursor = cursor.limit(limit);
      }
      const results = await cursor.toArray();

      this_user = results[0];  // 將this_user賦汝一個值,個值是carNum_response.data既第0個值  ===> carNum_response.data既第0個
      console.log("this_user")
      console.log(this_user)
      if(this_user===undefined&&urlparams.get("Parking Space Num")!==void 0){
        if(urlparams.get("Parking Space Num")===undefined 
          || +urlparams.get("Parking Space Num")<1
          || +urlparams.get("Parking Space Num")>11
        )return;
        const result = await collection.insertOne(
          {
            "_id":query["_id"],
            "Parking Space Num":urlparams.get("Parking Space Num")
          }
        );
        reload_admin()
      }
    }
    let carNum="?";
    if(this_user===undefined)carNum=urlparams.get("Parking Space Num");
    else carNum=this_user["Parking Space Num"];
    console.log('carNum="?"')
    console.log(carNum)
    console.log(this_user)
    if (this_user === undefined || this_user["charge duration"]===undefined) { 
      console.log(urlparams.get("Parking Space Num"))
      const limit = 1
      let sort = { "_id": -1 }
      const charging_cursor = collection.find(
        {
          // "start time": { "$exists": true },
          "charge duration": { $gt: 0 },
          "Parking Space Num": +urlparams.get("Parking Space Num")   // key: value
        }, { sort, limit }
      )
      const charging_rows = await charging_cursor.toArray()
      console.log("charging_rows")
      console.log(charging_rows)
      const charging_user = charging_rows[0]
      if (charging_user !== undefined){
        if (charging_user["start time"] !== undefined && (new Date(charging_user["start time"]).getTime() + (charging_user["charge duration"] * 60 * 1000)) - new Date(Date.now()).getTime() < 0){
          // charging_user finish
                                                          // const limit = 1
                                                          // let sort = { "_id": -1 }
                                                          // const selecting_cursor = collection.find(
                                                          //   {
                                                          //     // "start time": { "$exists": true },
                                                          //     // "charge duration": { $gt: 0 },
                                                          //     "Parking Space Num": +urlparams.get("Parking Space Num")   // key: value
                                                          //   }, { sort, limit }
                                                          // )
                                                          // const selecting_rows = await selecting_cursor.toArray()
                                                          // console.log("selecting_rows")
                                                          // console.log(selecting_rows)
                                                          // const selecting_user = selecting_rows[0]
                                                          // if(
                                                          //   /**/selecting_user/**/                  !==void 0
                                                          //   &&  selecting_user["Parking Space Num"] !==void 0
                                                          //   &&  selecting_user["charge duration"]   ===void 0
                                                          //   &&  selecting_user["start time"]        ===void 0
                                                          //   &&  selecting_user["_id"]!=(urlparams.get("_id").replaceAll("\"", ""))
                                                          // ){// selecting user exists
                                                          //   console.log("selecting user exists/-/-/-/-")
                                                          //   console.log(`${selecting_user["_id"]}!=${new mongodb.ObjectId(urlparams.get("_id").replaceAll("\"", ""))}`)
                                                          //   console.log(selecting_user["_id"]!=new mongodb.ObjectId(urlparams.get("_id").replaceAll("\"", "")))
                                                          //   res.send([not_this_user, void 0, void 0, carNum]);
                                                          //   console.log([not_this_user, void 0, void 0, carNum]);
                                                          //   return;
                                                          // }
          console.log("charging_user finish and no selecting user in this carNum/-/-/-/-")
          output = [FirstTime, void 0, void 0, carNum]
          console.log(`(${new Date(charging_user["start time"]).getTime()} + ${(charging_user["charge duration"] * 60 * 1000)}) - ${new Date(Date.now()).getTime()}`)
          console.log((new Date(charging_user["start time"]).getTime() + (charging_user["charge duration"] * 60 * 1000)) - new Date(Date.now()).getTime())
        }
        else{// charging_user not finish
          console.log("charging_user not finish/-/-/-/-")
          res.send([not_this_user, void 0, void 0, carNum]);
          console.log([not_this_user, void 0, void 0, carNum]);
          return;
        }
      }else{//charging_user not exisit
        console.log("charging_user not exisit/-/-/-/-")
        output = [FirstTime, void 0, void 0, carNum]
      }
      console.log("checking selecting user/-/-/-/-")
      // limit = 1
      // sort = { "_id": -1 }
      const selecting_cursor = collection.find(
        {
          // "start time": { "$exists": true },
          // "charge duration": { $gt: 0 },
          "Parking Space Num": +urlparams.get("Parking Space Num")   // key: value
        }, { sort, limit }
      )
      const selecting_rows = await selecting_cursor.toArray()
      console.log("selecting_rows")
      console.log(selecting_rows)
      const selecting_user = selecting_rows[0]
      if(
        /**/selecting_user/**/                  !==void 0
        &&  selecting_user["Parking Space Num"] !==void 0
        &&  selecting_user["charge duration"]   ===void 0
        &&  selecting_user["start time"]        ===void 0
        &&  selecting_user["_id"]!=(urlparams.get("_id").replaceAll("\"", ""))
      ){// selecting user exists
        console.log("selecting user exists/-/-/-/-")
        console.log(`${selecting_user["_id"]}!=${(urlparams.get("_id").replaceAll("\"", ""))}`)
        console.log(selecting_user["_id"]!=(urlparams.get("_id").replaceAll("\"", "")))
        res.send([not_this_user, void 0, void 0, carNum]);
        console.log([not_this_user, void 0, void 0, carNum]);
        return;
      }else 
        console.log("vaild user/-/-/-/-");
    }  //this user係db裏面找ga result 
    // else if(this_user["charge duration"]===undefined){
      
    // }
    else if (this_user["start time"] === undefined) {     //透過呢個logic得知this_user係排緊隊
      output = [InQueue, void 0, void 0, carNum];
    }
    else if ((new Date(this_user["start time"]).getTime() + (this_user["charge duration"] * 60 * 1000)) - new Date(Date.now()).getTime() < 0) {
      //Finish
      res.send([Finish, void 0, void 0, carNum]);
      console.log([Finish, void 0, void 0, carNum]);
      return
    }
    
    else if(this_user["charge duration"]!==undefined) {
      console.log(`${new Date(this_user["start time"]).getTime()} + ${(this_user["charge duration"] * 60 * 1000)}`)
      console.log(new Date(this_user["start time"]).getTime() + (this_user["charge duration"] * 60 * 1000))
      res.send([InUse, (new Date(this_user["start time"]).getTime() + (this_user["charge duration"] * 60 * 1000)), predicted_moved_time, carNum]);
      console.log([InUse, (new Date(this_user["start time"]).getTime() + (this_user["charge duration"] * 60 * 1000)), predicted_moved_time, carNum]);
      return
    }else output=[FirstTime, void 0, void 0, carNum]
    if (output[0] == FirstTime || output[0] == InQueue) {



      const queue_response_cursor = collection.find(
        {
          "charge duration":{ "$exists": true },
          "start time": null
        }, {
        "$sort": { "_id": 1 }   //sort by _id; 1==>順序
      }
      )
      const queue_response_data = await queue_response_cursor.toArray();
      console.log("queue_response");
      console.log(queue_response_data);
      const limit = 1
      let sort = { "start time": -1 }  //sort by _id; -1==>倒序
      const charging_cursor = collection.find(
        {
          "start time": { "$exists": true }
          , "charge duration": { $gt: 0 }
        }, { sort, limit }
      )
      const charging_rows = await charging_cursor.toArray()
      //console.log(charging_rows)
      const charging_user = charging_rows[0]  //get charging user
      console.log("charging_user");
      console.log(charging_rows);

      let charge_finish_time;
      if (charging_user === undefined) charge_finish_time = 0
      else charge_finish_time = (
        (new Date(charging_user["start time"]).getTime() +   //Date() ==>start time change to date formort ; .getTime ==>date format change to millis second ; string無辦法直接轉millis，所以要轉2次
          charging_user["charge duration"] * 60 * 1000) // -
        // new Date(Date.now()).getTime()
      )
      let charger_free_time = charge_finish_time;
      let queueNum = 1;
      for (let i = 0; i < queue_response_data.length; i += 1) {
        const queue_user = queue_response_data[i];
        if (queue_user["Parking Space Num"] == urlparams.get("Parking Space Num")) break;
        charger_free_time += queue_user["charge duration"] * 60 * 1000   // +=係累計咁解
        queueNum += 1;
      }
      console.log("charge_finish_time");
      console.log(charge_finish_time);
      // console.log([output[0], queueNum, charger_free_time, output[3]]);
      res.send([output[0], queueNum, charger_free_time, output[3],predicted_moved_time]);
      console.log([output[0], queueNum, charger_free_time, output[3],predicted_moved_time]);
      // console.log('[output[0], queueNum, charger_free_time, output[3]]');
      return
    }

    res.send(output);
    // return
  } catch (error) {
    console.error('查詢錯誤:', error);
    res.status(500).json({ error: '查詢失敗', details: error.message });
  }
});

// 添加新記錄的路由（用於首次使用）
app.post("/register", async (req, resp) => {const log = false;
  console.log('post"/register"')
  if (log) console.log('app.post("/register")' + req.url);
  if (log) console.log('app.post("/register")' + decodeURI(req.url));
  // if(log)console.log(req);
  var params = new URLSearchParams(req.url.split("?")[1]);
  if (log) console.log(params);
  try {
    let objectToInsert = {};
    params.forEach(function (part, index, theArray) {
      if (log) console.log(index + ":" + part);
      objectToInsert[index] = eval(part);
      if (log) console.log(index + ":" + objectToInsert[index]);
    });
    console.log("objectToInsert")
    console.log(objectToInsert);
    if(objectToInsert["Parking Space Num"]===undefined 
      || objectToInsert["Parking Space Num"]<1
      || objectToInsert["Parking Space Num"]>11
    )return;
    const result = await collection.insertOne(objectToInsert);
    if (log) console.log(result);
    const docsInserted = result.insertedId;
    if (log) console.log("docsInserted:" + docsInserted);
    resp.send(docsInserted);
    reload_admin()
    // if (timer._destroyed) {
    //   queue_shift();
    // }
  }
  catch {
    err => {
      if (log) console.log("err:" + err);
      resp.status(500).send(err);
    }
  }
});










app.post("/selected", async (req, resp) => {const log = true;
  console.log('post"/selected"')
  if (log) console.log('app.post("/selected")' + req.url);
  if (log) console.log('app.post("/selected")' + decodeURI(req.url));
  // if(log)console.log(req);
  var params = new URLSearchParams(req.url.split("?")[1]);
  if (log) console.log(params);
  try {
    let filter = {};
    let objectToInsert = {};
    params.forEach(function (part, index, theArray) {
      if (log) console.log(index + ":" + part);
      if(index!="_id")
      objectToInsert[index] = eval(part);
      else
        filter[index] = new ObjectId(part);
      if (log) console.log(index + ":" + objectToInsert[index]);
    });
    // const result = await collection.insertOne(objectToInsert);
    if(Object.keys(filter).length<=0)return;
    const result = await collection.updateOne(
      filter,
      {
        "$set": objectToInsert
      },
      { upsert: false },
    );
    if (log) console.log(result);
    resp.send(result);
    if (timer._destroyed) {
      queue_shift();
    }else send_to_client("message","fetchData")
  }
  catch {
    err => {
      if (log) console.log("err:" + err);
      resp.status(500).send(err);
    }
  }
  reload_admin();
});






//cancal記錄的路由
app.post("/cancal", async (req, resp) => {const log = false;
  console.log('post"/cancal');
  if (log) console.log('app.post("/cancal")' + req.url);
  if (log) console.log('app.post("/cancal")' + decodeURI(req.url));
  var params = new URLSearchParams(req.url.split("?")[1]);
  if (log) console.log(params);
  let filter = {};
  params.forEach(function (part, index, theArray) {
    if (log) console.log(index + ":" + part);
    if (index == "_id") filter[index] = new ObjectId(part);
    else filter[index] = eval(part);
    if (log) console.log(index + ":" + filter[index]);
  });
  if (log) console.log("filter");
  if (log) console.log(filter);
  let new_charge_duration = 0;
  let new_start_time;
  const cursor = collection.find(filter);
  const rows = await cursor.toArray();
  if (log) console.log(rows);
  if (!(rows[0]["start time"] === undefined)) {
    const charged_time = (new Date(Date.now()).getTime() - new Date(rows[0]["start time"]).getTime()) / 1000 / 60;
    if (log) console.log(charged_time);
    if (charged_time > rows[0]["charge duration"]) {
      return;
    }
    new_charge_duration = Math.floor(charged_time);
    new_start_time = rows[0]["start time"];
  } else {
    const now = new Date(Date.now());
    if (log) console.log(now);
    new_start_time = now;
  }
  const result = await collection.updateOne(
    filter,
    {
      "$set": {
        "start time": new_start_time,
        "charge duration": new_charge_duration,
      }
    },
    { upsert: false },
  );
  if (log) console.log(result);
  resp.send(result);
  queue_shift();
});

// 開始充電的路由（更新 start time）
async function queue_shift(exception=void 0) {console.log("queue_shiftqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
  const log=false;
  clearInterval(timer)
  var queue_Interval = null
  const limit = 1
  var sort = { "start time": -1 }  //sort by _id; -1==>倒序
  const charging_cursor = collection.find(
    {
      "start time": { "$exists": true }
      , "charge duration": { $gt: 0 }
    }, { sort, limit }
  )
  const charging_rows = await charging_cursor.toArray()
  if(log)console.log(charging_rows)
  const charging_user = charging_rows[0]  //get charging user
  var user_who_need_to_charge = { "Parking Space Num": 0, "charge duration": null }
  let remaining_time = -1   //配合196 logic
  let there_are_queuing = false
  if (!(charging_user === undefined)) {
    remaining_time = charging_user["start time"].getTime() + charging_user["charge duration"] * 1000 * 60 - (Date.now())
    // if(log)console.log((remaining_time))
    // if(log)console.log(charging_user["start time"].getTime())
    // if(log)console.log(charging_user["charge duration"])
    // if(log)console.log(Date.now())
    // if(log)console.log(user_who_need_to_charge)
  }
  if (remaining_time >= 0) {
    queue_Interval = remaining_time
    user_who_need_to_charge = charging_user
  }
  else {
    const queue_cursor = collection.find(  //collection.find 可以當係select咁解
      {
        "charge duration":{ "$exists": true },
        "start time": null
      }, {
      "$sort": { "_id": 1 }   //sort by _id; 1==>順序
    }
    )
    const queue_rows = await queue_cursor.toArray();  //.toArray相等於Ctrl C 然後Ctrl V落去queue_rows度 
    if(log)console.log(queue_rows)       //queue_rows係排緊隊ga人ga訊息
    if (queue_rows[0] != undefined) {
      there_are_queuing = true
      user_who_need_to_charge = queue_rows[0]
      queue_Interval = user_who_need_to_charge['charge duration'] * 1000 * 60
    }
  }
  if(log)console.log(millis_to_time_String(queue_Interval))
  //if(log)console.log(user_who_need_to_charge)
  let reloaded_client=0;
  let retry_reload_interval=setInterval(()=>{},10)
  clearInterval(retry_reload_interval);
  let retry_reload=()=>{
    reloaded_client=send_to_client("message","fetchData");
    if(Date.now() - last_queue_shift > 1)
      clearInterval(retry_reload_interval);
  }
  last_queue_shift = Date.now()
  retry_reload_interval=setInterval(retry_reload,500)
  await call_charger_move_to(user_who_need_to_charge["Parking Space Num"],_id=user_who_need_to_charge["_id"])  // TODO control fung's machine
  console.log("process returned to queue_shift")
  if (there_are_queuing) {
    const now = new Date(Date.now());
    const result = await collection.updateOne(
      user_who_need_to_charge,
      {
        "$set": {
          "start time": now,
        }
      },
      { upsert: false },
    );
    /*if(log)*/console.log(result)
    console.log(user_who_need_to_charge)
    // reload_all_client(_id=String(user_who_need_to_charge["_id"]))
    send_to_client("message","fetchData",_id=String(user_who_need_to_charge["_id"]))
    timer = setInterval(queue_shift, queue_Interval)
    //if(log)console.log("abc"+queue_Interval)
  }
}

let charger_moving_intervals=[setInterval(()=>{},10)]
async function call_charger_move_to(spot,_id = void 0) {//added ,_id = void 0
  console.log(`Moving to spot ${spot}`);
  let command = "calibrate";
  if (spot != 0) command = `move?spot=${spot}`;
  // console.log(`http://${charger_IPV4}/control/${command}`);

  // const result = await fetch(`http://${charger_IPV4}/control/${command}`);
  // console.log(result);
  const index_loc_msg_vaild_time=Date.now();
  send_to_index_loc("call_charger_move_to",spot);
  clearIntervals(charger_moving_intervals);
  // clearTimeout(charger_moving_interval);
  // let need_wait=0;
  // if(spot==0)need_wait=0;//need_wait = (32 * 1000);
  // else need_wait = parseInt(await(await(await fetch(`http://${charger_IPV4}/how_long`)).blob()).text());
  // else 
  await new Promise((resolve) => {
    charger_moving_intervals.push(setInterval(async () => {
      const completed = index_loc_msg_vaild_time<index_loc_msg_rev_time;
      if (completed) {
          resolve(); // 在完成後解析 Promise
      }else console.log({"completed":{"index_loc_msg_rev_time":index_loc_msg_rev_time}});
    }, 2000));
  });
  console.log("need_wait");
  console.log(need_wait);
  console.log(millis_to_time_String(need_wait));
  predicted_moved_time = Date.now()+(isNaN(need_wait)?0:need_wait);
  console.log(Date.now());
  console.log(millis_to_time_String(Date.now()));
  console.log(predicted_moved_time);
  console.log(millis_to_time_String(predicted_moved_time));
  // last_queue_shift=Date.now();
  if(_id!==void 0)send_to_client("message","fetchData",_id=_id)//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  console.log("sleeping");
  await sleep(need_wait);
  console.log("sleeped-----------------------------------------------------------------------------------------------------------------------");
  const isComplete_list=[];
  let fetch_count = 0;
  let isComplete_start=Date.now();
  const check_charger_complete_move = async () => {
      // console.log(`Checking if charger has completed move: http://${charger_IPV4}/is_charger_complete_move`);
      fetch_count++;
      // const is_charger_complete_move = await fetch(`http://${charger_IPV4}/is_charger_complete_move`);
      // if(charger_moving_interval.destroyed)return;
      // console.log(is_charger_complete_move.status)
      // isComplete_list.push(await (await is_charger_complete_move.blob()).text() === "1");
      // const isComplete = isComplete_list.some(a=>a);
      const isComplete = (Date.now()-predicted_moved_time>0);
      console.log([isComplete_list.length,isComplete,fetch_count]);
      if (isComplete) {
          clearIntervals(charger_moving_intervals);
          console.log(`Charger has completed the move to spot ${spot}`);
          return true; // 返回完成狀態
      }
      return false; // 返回未完成狀態
  }

  return new Promise((resolve) => {
      charger_moving_intervals.push(setInterval(async () => {
          const completed = await check_charger_complete_move();
          if (completed) {
              resolve(); // 在完成後解析 Promise
          }else if(predicted_moved_time<Date.now())
            predicted_moved_time = Date.now() + (15 * 1000);
      }, 2000));
  });
  
  // return new Promise(async(resolve) => {
  //   let completed=false;
  //   while(!completed){
  //     completed = await check_charger_complete_move();
  //     if (completed) {
  //       resolve(); // 在完成後解析 Promise
  //     }else if(predicted_moved_time<Date.now())
  //       predicted_moved_time = Date.now() + (15 * 1000);
  //   }
  // });
}
// 啟動服務器
async function startServer() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(`後端服務器運行在 http://localhost:${port}`);
  });
  queue_shift();
}

startServer();