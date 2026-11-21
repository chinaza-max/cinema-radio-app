import json
cast={
 "claude":{"name":"Claude","role":"The station's AI helper","model":"toon","skin":"#efe4d6","hair":"#d97757","hairstyle":"bald","coat":"#d97757","coat2":"#ffb089","pants":"#3b2f2a","trim":"#f4efe6","gear":"visor,halo,scarf,belt","build":"slim","tag":"#ffb089","voice":"en-US-AndrewNeural","rate":0.98},
 "amara":{"name":"Amara","role":"Young engineer","model":"toon","skin":"#7a4a2e","hair":"#14110f","hairstyle":"afro","coat":"#3a86ff","coat2":"#ffd166","pants":"#22303c","trim":"#ffd166","gear":"belt,headband","build":"slim","sc":0.94,"tag":"#7db0ff","voice":"en-NG-EzinneNeural"},
 "okoro":{"name":"Mr. Okoro","role":"Station keeper","model":"toon","skin":"#5d3b26","hair":"#cfcfd6","hairstyle":"cap","beard":"#cfcfd6","coat":"#6a994e","coat2":"#386641","pants":"#31352f","trim":"#222222","gear":"scarf","build":"stocky","tag":"#a7c957","voice":"en-NG-AbeoNeural","pitch":0.9},
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
("The Station at the Edge",[
 S(N,"On the edge of a stormy planet stands Lantern Station, a tall lamp for ships in the dark. Three beings keep it burning: a keeper, an engineer, and a helper made of light.",["okoro:300","amara:200","claude:100"],"planet","dusk",["beacon"],["dust","haze"],"wide"),
 S("amara","Claude, the storm is getting louder. Tell me it will pass before the supply ship arrives. Please say yes.",["amara:200","claude:120"],"bridge","dim",["hologram"],["dust"],"medium"),
 S("claude","I would like to say yes, Amara. But the honest answer is that I do not know. The pressure is falling and the wind is rising, and I can show you exactly what I measured. I just cannot promise the ending.",["claude:120","amara:210"],cam="close"),
 S("okoro","Hmph. A helper that says it does not know. In forty years, the machines I met always sounded very sure.",["okoro:330>260","amara:210"],cam="medium"),
 S("claude","Sounding sure is easy, Mr. Okoro. Being right is harder. I would rather give you a true maybe than a false certainty, especially tonight.",["claude:120","okoro:260"],cam="medium"),
 S(N,"Far above the clouds, a small cargo ship named the Dove was falling toward the storm, with a family aboard and no lamp but theirs.",[],"space","night",[],["streaks"],"orbit"),
 S("amara","The Dove is calling us! They have lost their guide signal. Our beacon is the only light they can follow, and it is flickering.",["amara:200","claude:120","okoro:300"],"bridge","alert",["hologram"],["alarm"],"medium"),
]),
("A Light for the Dove",[
 S("okoro","The beacon lens is cracked. Somebody has to climb the tower and swap the crystal by hand, in this wind. That somebody is me. I climbed it in worse.",["okoro:300>200:point","amara:200"],"corridor","alert",[],["alarm","sparks"],"medium"),
 S("claude","Mr. Okoro, with respect, your knees were not built for the ladder, and the winds are above safe limits. I can guide Amara through it from the ground, step by step. Will you let me help?",["claude:110","okoro:200"],cam="close"),
 S("okoro","Fine. Help. But if you steer her wrong, I will turn you into a very expensive lamp.",["okoro:200","amara:290"],cam="medium"),
 S(N,"So the girl climbed the tower with Spark at her side, while Claude's voice counted every rung in her ear.",["amara:60>200:run","spark:100>160:run"],"planet","night",["beacon"],["dust","sparks"],"wide"),
 S("claude","Left hand up, Amara. Good. Now the clasp, a quarter turn. Hold on, I need to correct myself. I told you clockwise, and I was wrong. It is anticlockwise. I am sorry. Please stop.",["amara:200","claude:80"],cam="medium"),
 S("amara","You almost made me break it! But thank you for saying so right away. I would much rather hear that you were wrong than find out the hard way.",["amara:200","claude:90"],cam="close"),
 S(N,"The crystal clicked into place. The beacon flared, brighter than it had burned in years, and its beam cut the storm like a golden road.",["amara:200"],"planet","alert",["beacon"],["sparks","streaks","haze"],"low"),
]),
("What the Light Is For",[
 S("amara","The Dove sees us! They are turning toward the beam. Claude, can they land in this wind?",["amara:200","claude:110","okoro:300"],"bridge","alert",["hologram"],["alarm"],"medium"),
 S("claude","There is a gap in the storm in about four minutes, and I think they can make it. I am about seventy percent sure. That is not a promise, but it is the best true number I have, and I will keep telling you as it changes.",["claude:110","amara:200"],cam="close"),
 S("okoro","Seventy. Ha. In forty years, nobody ever gave me a number and told me how sure it was. Keep it coming, helper.",["okoro:300","claude:110"],cam="medium"),
 S(N,"The Dove dropped through the clouds, tipping and shuddering, following the golden beam down the sky.",[],"planet","night",["beacon"],["streaks","dust"],"orbit"),
 S("claude","The gap is open. Eighty percent. Ninety. Wind dropping. They are on the pad. Everyone is alive. I wanted to tell you plainly: everyone is alive.",["claude:110","amara:200","okoro:300"],"bridge","day",["hologram"],["dust"],"medium"),
 S("okoro","Well. Maybe a helper that says what it knows is worth keeping. Come, all of you. Dinner is on me, and I do not cook for just anyone.",["okoro:300","amara:200","claude:110"],cam="wide"),
 S(N,"And above the quiet station, the beacon went on burning through the night, to be a light for whoever might still be lost, and for whoever might still be learning to say, I do not know, but I will find out with you.",[],"space","night",[],["streaks"],"out"),
]),
]
m={"schemaVersion":1,"slug":"the-lantern-keepers","title":"The Lantern Keepers",
 "synopsis":"On a stormy planet, a keeper, an engineer and a helper made of light must guide a falling ship home. An original story about telling the truth, even when it is \"I do not know\".",
 "credit":"Original story and characters.",
 "genre":"Science fiction","style":"cinema","poster":"/posters/the-lantern-keepers.jpg","featured":True,
 "cover":{"place":"planet","time":"dusk","props":["beacon"],"fx":["haze"],"characters":["amara:150","claude:240"],"camera":"low"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/the-lantern-keepers.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
