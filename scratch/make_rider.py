import json
cast={
 "tobi":{"name":"Tobi","role":"Delivery rider","model":"toon","skin":"#8d5a3b","hair":"#1b1b1f","hairstyle":"short","coat":"#e63946","coat2":"#ffd23f","pants":"#2b2d42","trim":"#ffd23f","gear":"bolt,belt","build":"slim","tag":"#ff6b6b","voice":"en-NG-AbeoNeural"},
 "ife":{"name":"Mama Ife","role":"Tobi's grandmother","model":"toon","skin":"#6b4226","hair":"#d9d9de","hairstyle":"bun","coat":"#2a9d8f","coat2":"#e9c46a","pants":"#264653","trim":"#e9c46a","gear":"glasses,scarf","build":"stocky","sc":0.92,"tag":"#5fd3c4","voice":"en-NG-EzinneNeural","pitch":0.95},
 "kemi":{"name":"Dr. Kemi","role":"Grid engineer","model":"toon","skin":"#a0694a","hair":"#241a14","hairstyle":"braids","coat":"#f4f1ea","coat2":"#4cc9f0","pants":"#3a3f58","trim":"#4cc9f0","gear":"coat,glasses","build":"regular","tag":"#8ee3ff","voice":"en-GB-SoniaNeural"},
 "chidi":{"name":"Chidi","role":"Bus driver and best friend","model":"toon","skin":"#5a3825","hair":"#111111","hairstyle":"afro","coat":"#f4a261","coat2":"#e76f51","pants":"#3d405b","trim":"#ffffff","gear":"headband","build":"stocky","tag":"#ffb27d","voice":"en-US-ChristopherNeural"},
 "surge":{"name":"Surge","role":"The man who drinks the grid","model":"toon","skin":"#d9b8a3","hair":"#7b2cbf","hairstyle":"bald","coat":"#3c096c","coat2":"#9d4edd","pants":"#10002b","trim":"#c77dff","gear":"coat,mask","build":"slim","sc":1.08,"tag":"#c77dff","voice":"en-GB-RyanNeural","pitch":0.85,"rate":0.95},
 "spark":{"name":"Spark","role":"Repair drone","model":"robot","coat":"#4cc9f0","tag":"#9be7ff","voice":"en-US-JennyNeural","pitch":1.7,"rate":1.1},
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
("The Slowest Rider in Lagos",[
 S(N,"Lagos never sleeps, and neither does Tobi. He delivers food on a battered motorbike, and he is always, always a little bit late.",["tobi:40>200:run","chidi:360>300"],"city","dusk",["bus"],["dust"],"wide"),
 S("chidi","Tobi! You are late again. The jollof is cold, the customer is angry, and your grandmother called me twice. Twice!",["chidi:300>240:point","tobi:200>150"],cam="medium"),
 S("tobi","Traffic, Chidi. The whole city is in traffic. If I could only go faster than all of it, I would be a rich man by Friday.",["tobi:150>190:shake","chidi:240>280"],cam="close"),
 S("ife","My boy, a rich man is not the one who arrives first. He is the one who arrives, and is welcome. Now eat something before the lights go out.",["ife:380>260","tobi:190>140:nod"],cam="medium"),
 S(N,"Mama Ife was right about the lights. All week, the city had been dimming, street by street, as if something out there was drinking the power.",["ife:260>200","tobi:140>90"],"city","night",["bus"],["haze"],"high"),
 S("kemi","I am Dr. Kemi, from the grid control. Every night, a quarter of the current goes missing. Not lost. Taken. And tonight the thief comes to the old pylon on Adeola Street.",["kemi:380>270","chidi:120>180"],cam="medium"),
 S("tobi","Then I will deliver my last order there. I was going that way anyway. Chidi, keep the bus warm.",["tobi:100>300:run","kemi:270>230"],cam="wide"),
]),
("The Night the Sky Struck Back",[
 S(N,"The old pylon hummed in the dark, thick with cables and the smell of rain. Tobi leaned his bike against it, and looked up.",["tobi:60>180"],"city","night",["pylon"],["sparks","haze"],"low"),
 S("tobi","Hello? Delivery for the thief. Cash on arrival. Extra pepper.",["tobi:180>230","spark:370>300"],cam="medium"),
 S("spark","Beep. Warning. Storm cell overhead. Please step away from the transformer. Please. Please step away.",["spark:300>250:run","tobi:230>200"],cam="close"),
 S(N,"The sky split open. A single bolt of lightning fell straight onto the pylon, and the pylon threw it straight into Tobi.",["tobi:200>150:fall","spark:250>330:run"],"city","alert",["pylon"],["alarm","sparks","streaks"],"in"),
 S(N,"When he opened his eyes, the rain had stopped, in mid air. Every drop hung glittering around him like tiny lamps, and Tobi was standing quite still in the middle of it.",["tobi:150>190"],"city","night",["pylon"],["haze"],"orbit"),
 S("tobi","Why is everything so slow? Spark! Why are you making that face? Spark, say something!",["tobi:190>240:dash","spark:330>280"],cam="medium"),
 S("spark","Beep. You are moving at four hundred kilometres per hour, Tobi. And you appear to be glowing. Please do not touch anything.",["spark:280>340:run","tobi:240>120:dash"],cam="wide"),
 S(N,"He ran the length of Adeola Street before his first heartbeat finished. And when he stopped, grinning, with his hair standing on end, he knew that he was never going to be late again.",["tobi:120>340:dash"],"city","night",["pylon"],["sparks","streaks"],"wide"),
]),
("The Man Who Drank the Grid",[
 S("kemi","Tobi, this is serious. The thief is called Surge. He was an engineer once. His machine now feeds on electricity, and it feeds on the city.",["kemi:370>260","tobi:80>180"],"engine","dim",["monolith"],["sparks","haze"],"medium"),
 S("tobi","So I run faster than he drains. Easy. Chidi, I will need a mask and a cape. Something with a bolt on it, something proud.",["tobi:180>230:point","kemi:260>200"],cam="close"),
 S("ife","I made it from your grandfather's red coat, and a little yellow cloth. Do not tear it, my boy. And do not forget to eat.",["ife:380>290","tobi:230>150:nod","chidi:60>120"],cam="medium"),
 S(N,"That night, every light in Lagos flickered at once. A tall man in a purple coat walked into the central station, with a machine humming on his back like a swarm of bees.",["surge:380>250"],"engine","alert",["monolith"],["alarm","sparks"],"low"),
 S("surge","Ah. The city is so bright, and so wasteful. All these lamps burning for nobody. I will drink them, and I will be brighter than all of you.",["surge:250>200:point","kemi:80>130"],cam="close"),
 S("kemi","Surge, stop. You will burn out the whole grid. Hospitals, schools, everything. There are people who need those lights.",["kemi:130>170","surge:200>260"],cam="medium"),
 S(N,"And then a red streak crossed the hall, so fast that the air cracked behind it. A rider in a cape stood in front of the machine, panting, and not at all late.",["tobi:60>200:dash","surge:260>320"],"engine","alert",["monolith"],["sparks","streaks"],"wide"),
]),
("Faster Than the Light",[
 S("surge","A boy in a cape. Charming. You are all current, child, and I eat current. Let us see how long you can run before I catch you.",["surge:320>260:point","tobi:200>150"],"engine","alert",["monolith"],["sparks"],"medium"),
 S("tobi","I have been running my whole life, Surge, and I have never once been caught. Not even by the police. Chidi, now!",["tobi:150>80:dash","kemi:200>170"],cam="close"),
 S(N,"Around the machine, down the corridor, across the roofs of Lagos. A red streak and a purple storm, racing, while the whole city held its breath.",["tobi:60>340:dash","surge:300>120:run"],"city","night",["pylon","bus"],["sparks","streaks"],"wide"),
 S("chidi","Tobi, the bus! Jump on the bus! I am parked under the big pylon, the one he is trying to reach. Lead him here!",["chidi:80>160:wave","tobi:340>240:run"],cam="medium"),
 S("kemi","The machine is overloaded, Tobi. If you can pull enough current through it, faster than it can eat, it will break. Run in a circle. As fast as you can.",["kemi:380>300:point","spark:360>320"],cam="medium"),
 S(N,"So Tobi ran. Around the pylon, around the bus, around Surge himself, faster and faster until the lightning that had once changed him began to leave him again, in a ring of white fire.",["tobi:300>60:dash","surge:200>230"],"city","alert",["pylon","bus"],["sparks","streaks","alarm"],"orbit"),
 S("surge","No. No, stop. It is too bright. I cannot hold it. I only wanted to be seen. I only wanted... the lights to look at me.",["surge:230>260:sad","kemi:300>240"],"city","dusk",["pylon","bus"],["haze"],"close"),
 S("kemi","We see you, Surge. But not like this. Let me help you take the machine off, and I promise we will still be here in the morning.",["kemi:240>290","surge:260>320:nod"],cam="medium"),
 S(N,"The next evening, the lights of Lagos came on, all of them at once, brighter than anyone could remember. And somewhere above the traffic, a boy in a red cape was delivering dinner exactly on time.",["tobi:60>340:dash","ife:380>300","chidi:100>160:wave"],"city","dusk",["bus"],["dust","sparks"],"wide"),
]),
]
m={"schemaVersion":1,"slug":"lightning-rider","title":"Lightning Rider",
 "synopsis":"A late delivery rider in Lagos is struck by lightning and becomes the fastest person in the city, just as a stranger starts drinking the power grid. An original cartoon superhero story with a different look for every character.",
 "credit":"Original story and characters.",
 "genre":"Science fiction","style":"cinema","poster":"/posters/lightning-rider.jpg","featured":True,
 "cover":{"place":"city","time":"dusk","props":["pylon"],"fx":["sparks"],"characters":["tobi:150:dash","kemi:260"],"camera":"low"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/lightning-rider.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
