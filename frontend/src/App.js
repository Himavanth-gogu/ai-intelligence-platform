import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { FaRobot, FaUser, FaEdit } from "react-icons/fa";

function App() {

const [message,setMessage] = useState("");
const [chat,setChat] = useState([]);
const [loading,setLoading] = useState(false);
const [editIndex,setEditIndex] = useState(null);

const chatEndRef = useRef(null);
const fileInputRef = useRef(null);

useEffect(()=>{
chatEndRef.current?.scrollIntoView({behavior:"smooth"});
},[chat]);

const getTime = ()=>{
return new Date().toLocaleTimeString([],{
hour:"2-digit",
minute:"2-digit"
});
};


const streamText = (text,index=0,output="") => {

if(index >= text.length) return;

output += text[index];

setChat(prev => {

const updated = [...prev];

const last = updated.length - 1;

updated[last] = {
...updated[last],
text: output
};

return updated;

});

setTimeout(()=>{
streamText(text,index+1,output);
},15);

};


const sendMessage = async()=>{

if(!message.trim()) return;

const userMessage = {
role:"user",
text:message,
time:getTime()
};

if(editIndex !== null){

const updated=[...chat];
updated[editIndex].text=message;
setChat(updated);
setEditIndex(null);

}else{

setChat(prev=>[...prev,userMessage]);

}

setMessage("");
setLoading(true);

setChat(prev=>[
...prev,
{role:"ai",text:"",time:getTime()}
]);

try{

let res;

if(message.toLowerCase().includes("pdf")){

res = await axios.post(
"http://localhost:8000/ask_pdf",
{question:message}
);

streamText(res.data.answer);

}else{

res = await axios.post(
"http://localhost:8000/chat",
{message:message}
);

streamText(res.data.response);

}

}catch{

streamText("Server error");

}

setLoading(false);

};


const editMessage = (i)=>{

setMessage(chat[i].text);
setEditIndex(i);

};


const uploadPDF = async(file)=>{

const formData = new FormData();

formData.append("file",file);

await axios.post(
"http://localhost:8000/upload_pdf",
formData
);

setChat(prev=>[
...prev,
{
role:"ai",
text:"PDF uploaded. Ask questions using 'pdf'.",
time:getTime()
}
]);

};


const handleDrop=(e)=>{

e.preventDefault();

const file=e.dataTransfer.files[0];

if(file){
uploadPDF(file);
}

};


return(

<div style={{
display:"flex",
height:"100vh",
background:"#0f172a",
color:"white",
fontFamily:"Inter"
}}>

{/* SIDEBAR */}

<div style={{
width:"260px",
background:"#020617",
padding:"20px",
borderRight:"1px solid #1e293b"
}}>

<h2>AI Platform</h2>

<p style={{
color:"#94a3b8",
fontSize:"14px"
}}>
Chat + PDF AI
</p>

<hr style={{
margin:"20px 0",
borderColor:"#1e293b"
}}/>

<div
onDrop={handleDrop}
onDragOver={(e)=>e.preventDefault()}
style={{
border:"2px dashed #334155",
padding:"15px",
textAlign:"center",
borderRadius:"8px",
fontSize:"14px",
color:"#94a3b8"
}}
>

Drag & Drop PDF

<br/>

<button
onClick={()=>fileInputRef.current.click()}
style={{
marginTop:"10px",
padding:"8px 12px",
background:"#1e293b",
border:"none",
color:"white",
borderRadius:"6px",
cursor:"pointer"
}}
>
Upload PDF
</button>

<input
type="file"
accept=".pdf"
ref={fileInputRef}
onChange={(e)=>uploadPDF(e.target.files[0])}
style={{display:"none"}}
/>

</div>

</div>


{/* CHAT AREA */}

<div style={{
flex:1,
display:"flex",
flexDirection:"column"
}}>


<div style={{
flex:1,
overflowY:"auto",
padding:"40px"
}}>

{chat.map((c,i)=>(

<div key={i} style={{
display:"flex",
marginBottom:"20px",
alignItems:"flex-start",
justifyContent:c.role==="user"?"flex-end":"flex-start"
}}>

{c.role==="ai" && (
<FaRobot style={{marginRight:"10px",marginTop:"5px"}}/>
)}

<div>

<div style={{
background:c.role==="user"
? "linear-gradient(135deg,#2563eb,#4f46e5)"
: "#1e293b",
padding:"12px 16px",
borderRadius:"10px",
maxWidth:"500px"
}}>
{c.text}
</div>

<div style={{
fontSize:"11px",
color:"#94a3b8",
marginTop:"3px"
}}>
{c.time}
</div>

</div>

{c.role==="user" && (

<div style={{display:"flex",alignItems:"center"}}>

<FaUser style={{marginLeft:"10px",marginTop:"5px"}}/>

<FaEdit
onClick={()=>editMessage(i)}
style={{
marginLeft:"8px",
cursor:"pointer",
color:"#94a3b8"
}}
/>

</div>

)}

</div>

))}

{loading && (
<div style={{color:"#94a3b8"}}>
AI typing...
</div>
)}

<div ref={chatEndRef}></div>

</div>


<div style={{
padding:"20px",
borderTop:"1px solid #1e293b",
display:"flex",
background:"#020617"
}}>

<input
value={message}
onChange={(e)=>setMessage(e.target.value)}
onKeyDown={(e)=>{
if(e.key==="Enter") sendMessage();
}}
placeholder="Ask AI or ask about uploaded PDF"
style={{
flex:1,
padding:"14px",
borderRadius:"10px",
border:"none",
background:"#1e293b",
color:"white",
outline:"none"
}}
/>

<button
onClick={sendMessage}
style={{
marginLeft:"10px",
padding:"14px 24px",
background:"linear-gradient(135deg,#22c55e,#16a34a)",
border:"none",
borderRadius:"10px",
color:"white",
cursor:"pointer"
}}
>
Send
</button>

</div>

</div>

</div>

);

}

export default App;