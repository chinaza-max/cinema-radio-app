import json
cast={
 "chris":{"name":"Chris Gardner","role":"Salesman, later stockbroker","model":"toon","skin":"#6b4428","hair":"#161412","hairstyle":"short","coat":"#6b7a8f","coat2":"#e0e1dd","pants":"#2f3640","trim":"#9aa5b1","gear":"belt","build":"regular","tag":"#9db4d3","voice":"en-US-GuyNeural"},
 "christopher":{"name":"Christopher","role":"His young son","model":"toon","skin":"#7a4c2e","hair":"#0f0d0c","hairstyle":"short","coat":"#ffb703","coat2":"#fb8500","pants":"#264653","trim":"#ffffff","build":"slim","sc":0.62,"tag":"#ffd166","voice":"en-US-AnaNeural","pitch":1.5},
 "linda":{"name":"Linda","role":"His wife","model":"toon","skin":"#8a5a3a","hair":"#1a1210","hairstyle":"long","coat":"#c9184a","coat2":"#ff758f","pants":"#3a3a46","trim":"#ffe5ec","gear":"scarf","build":"slim","tag":"#ff8fa3","voice":"en-US-JennyNeural"},
 "broker":{"name":"The stockbroker","role":"Man from the sports car","model":"toon","skin":"#e0b99b","hair":"#3a2a1c","hairstyle":"short","coat":"#1d3557","coat2":"#a8dadc","pants":"#14213d","trim":"#ffd166","gear":"coat","build":"regular","tag":"#7aa2d6","voice":"en-US-DavisNeural"},
 "manager":{"name":"The manager","role":"Head of the internship","model":"toon","skin":"#c99b7a","hair":"#cfcfd6","hairstyle":"bun","coat":"#6a4c93","coat2":"#c8b6ff","pants":"#2b2d42","trim":"#c8b6ff","gear":"glasses,coat","build":"stocky","tag":"#c8b6ff","voice":"en-US-AriaNeural"},
 "doctor":{"name":"The doctor","role":"Potential customer","model":"toon","skin":"#d9b8a3","hair":"#2b2b2b","hairstyle":"bald","coat":"#f4f1ea","coat2":"#4cc9f0","pants":"#3a3f58","trim":"#4cc9f0","gear":"coat,glasses","build":"regular","tag":"#8ee3ff","voice":"en-GB-RyanNeural"},
}
def S(sp,text,c,place=None,time=None,props=None,fx=None,cam=None):
    d={"speaker":sp,"text":text,"characters":c}
    if place:d["place"]=place
    if time:d["time"]=time
    if props is not None:d["props"]=props
    if fx is not None:d["fx"]=fx
    if cam:d["camera"]=cam
    return d
N="narrator"
eps=[
("Bone-Density Scanners",[
 S(N,"Chris Gardner is a hardworking salesman in San Francisco, living with his wife, Linda, and their young son, Christopher. He has put almost all of his savings into portable bone-density scanners.",["chris:60>200","christopher:340"],"city","day",[],["dust"],"wide"),
 S(N,"He believes that selling them to medical professionals will make his family secure. But the scanners are expensive, and the hospitals are slow to buy.",["chris:200","doctor:320"],"corridor","day",[],[],"medium"),
 S("chris","This one is lighter and faster than the old equipment. Give me ten minutes of your day, and let me show you.",["chris:200","doctor:320"],cam="close"),
 S("linda","Chris, I am working long hours to hold this house together, and you keep chasing a sale that never comes. I cannot do this much longer.",["linda:310","chris:150"],"city","dusk",[],["haze"],"medium"),
 S(N,"The arguments grow more frequent, and the marriage slowly falls apart. Linda decides she can no longer cope, and leaves San Francisco for a job in New York. Christopher stays with his father.",["linda:310>380:run","christopher:200","chris:150"],"city","night",[],["haze"],"wide"),
 S(N,"One day, Chris sees a wealthy man step out of an expensive sports car. Curious, he walks over and asks him what he does for a living.",["broker:320","chris:80>200:run"],"city","day",[],["dust"],"medium"),
 S("broker","I am a stockbroker. I help people invest in the stock market, and that is how I make my money.",["broker:320","chris:200"],cam="medium"),
 S(N,"The answer changes everything. Chris begins to believe that becoming a stockbroker could give him the stability he is desperate for.",["chris:200"],cam="close"),
]),
("The Internship",[
 S(N,"He decides to apply for an internship at Dean Witter Reynolds, a major brokerage firm. But many candidates are competing for it, and most have better money and better qualifications.",["chris:60>200","manager:330"],"corridor","day",[],[],"wide"),
 S(N,"Chris finally gets an interview with the management. But just before it, he is arrested for failing to pay his parking tickets, and he spends the night in jail.",["chris:200"],"corridor","night",[],[],"low"),
 S(N,"The next morning, he has no time to prepare, and he arrives looking untidy.",["chris:60>190:run"],"city","day",[],["dust"],"wide"),
 S("manager","You are not exactly dressed for an interview. Tell us why we should take you seriously.",["manager:320","chris:190"],"corridor","day",[],[],"medium"),
 S("chris","I am honest about where I am, and I learn fast. Give me a chance, and I will work harder than anyone here.",["chris:190","manager:320"],cam="close"),
 S(N,"Despite his appearance, he impresses the interviewers with his intelligence, his confidence and his honesty. He is selected for a six-month training programme.",["chris:190","manager:320:nod"],cam="medium"),
 S(N,"There is one major problem. The internship is unpaid, and only one trainee will receive a permanent job at the end.",["chris:190"],cam="close"),
 S(N,"Now Chris must raise his young son alone, attend the internship, and keep selling his scanners.",["chris:190","christopher:250"],"city","dusk",[],["haze"],"medium"),
]),
("Nowhere to Sleep",[
 S(N,"His finances become desperate. He falls behind on rent, and he and Christopher are forced to leave their apartment.",["chris:190","christopher:250"],"city","day",[],["dust"],"medium"),
 S(N,"Father and son move from place to place, looking for somewhere to sleep. Some nights they stay in homeless shelters. Other nights they have nowhere to go.",["chris:190","christopher:250"],"city","night",[],["haze"],"low"),
 S(N,"In one heartbreaking moment, they spend the night inside a public restroom at a subway station. Chris locks the door and sits on the floor to protect his sleeping son, fighting back tears.",["chris:190","christopher:250"],"corridor","night",[],[],"low"),
 S(N,"Despite everything, he refuses to let his son lose hope.",["chris:190","christopher:250"],cam="close"),
 S(N,"Every morning, he attends the internship in his best clothes. He learns to talk to clients, make investment calls and understand the market.",["chris:60>200:run"],"corridor","day",[],[],"wide"),
 S(N,"With no time and no money to spare, he becomes extremely efficient. He makes calls continuously, takes no unnecessary breaks, and works to attract clients.",["chris:200"],cam="medium"),
 S(N,"He also keeps selling his remaining scanners. At one point, a doctor who had shown interest finally buys one, giving him a little relief, though his bigger problems remain.",["chris:200","doctor:320"],"corridor","day",[],[],"medium"),
 S(N,"Throughout the internship, he earns a reputation for being hardworking, intelligent and determined, and his supervisor begins to notice.",["chris:200","manager:320"],cam="medium"),
 S(N,"But he knows that hard work may not be enough. As the final day approaches, he becomes anxious. He has sacrificed almost everything, and failure would mean returning to the same difficult circumstances.",["chris:200"],"corridor","night",[],[],"close"),
 S(N,"Eventually, Chris is called into his manager's office.",["chris:60>190","manager:320"],"corridor","day",[],[],"wide"),
 S("manager","You have successfully completed the internship. We are offering you the full-time position.",["manager:320","chris:190"],cam="close"),
 S(N,"For a moment, Chris struggles to contain his emotions. He thanks the management, leaves the office, and walks into the street. Overwhelmed with happiness, he begins clapping as tears fill his eyes.",["chris:190>260","christopher:340"],"city","dusk",[],["dust","sparks"],"orbit"),
 S(N,"He later becomes a successful stockbroker, and eventually establishes his own investment firm. Circumstances do not have to decide a person's future. Success is not about having the best starting point. It is about refusing to give up when everything around you seems to be falling apart.",[],"city","dusk",[],["haze"],"out"),
]),
]
m={"schemaVersion":1,"slug":"the-pursuit-of-happyness","title":"The Pursuit of Happyness",
 "synopsis":"The true-life story of Chris Gardner, a San Francisco salesman who, with his young son and no home, wins the only permanent place at the end of an unpaid stockbroker internship.",
 "credit":"Retold from the true story of Chris Gardner. Our own scenes and wording.",
 "genre":"Drama","style":"cinema","poster":"/posters/the-pursuit-of-happyness.jpg","featured":True,
 "cover":{"place":"city","time":"dusk","props":[],"fx":["dust"],"characters":["christopher:170","chris:230"],"camera":"wide"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/the-pursuit-of-happyness.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
