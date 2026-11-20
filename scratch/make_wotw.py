import json
cast={
 "will":{"name":"The Narrator","role":"A writer of the village","coat":"#6b7f95","tag":"#8fb0d0","model":"avatar","voice":"en-US-ChristopherNeural"},
 "ogilvy":{"name":"Ogilvy","role":"Astronomer","coat":"#8a6a45","tag":"#c9a56e","model":"android","voice":"en-GB-RyanNeural","pitch":0.95},
 "catherine":{"name":"Catherine","role":"The Narrator's wife","coat":"#e4b64a","tag":"#ffcf6b","model":"michelle","voice":"en-GB-SoniaNeural"},
 "gunner":{"name":"The Artilleryman","role":"Soldier, last of his battery","coat":"#7d8a5a","tag":"#a9b87a","model":"soldier","voice":"en-US-GuyNeural","pitch":0.92},
 "wire":{"name":"The Wire","role":"News from the telegraph","coat":"#5fd8f0","tag":"#8be9ff","model":"hologram","voice":"en-NG-EzinneNeural"},
 "tripod":{"name":"The Visitor","role":"Walker from Mars","coat":"#7a1608","tag":"#ff7a5c","model":"robot","voice":"en-US-JennyNeural","pitch":0.6,"rate":0.9},
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
("The Cylinder",[
 S(N,"For centuries we believed the world was ours alone. But across the dark between planets, cool and patient minds were watching Earth, and drawing their plans.",[],"space","night",[],["streaks"],"orbit"),
 S(N,"One evening a streak of green fire fell onto the common outside a quiet village. Ogilvy the astronomer ran toward it. His friend, a writer, followed close behind.",["ogilvy:40>150","will:330>240"],"planet","dusk",["pod"],["dust","haze"]),
 S("ogilvy","This is no meteor. Look at the shape of it. A cylinder, and so hot that the air bends around it. Keep back, my friend.",["ogilvy:150>130:point","will:240>200"],cam="medium"),
 S("will","Ogilvy, listen. Something is moving inside. A slow scraping, like a lid being turned from within.",["will:200>170","ogilvy:130>95"],cam="close"),
 S(N,"The end of the cylinder fell away. Out of the dark reached something grey and glistening, with eyes like wet stone, and it looked at the world it had come to take.",["will:170>150","ogilvy:95>70:shake"],fx=["dust","haze","alarm"],cam="in"),
 S("ogilvy","They are intelligent. They must be. Wave the white flag. We will show them that we mean peace.",["ogilvy:70>150:wave","will:150>240"],cam="low"),
 S(N,"He walked out alone, holding the white flag high. A flash of heat answered him, and in one breath the common was on fire.",["ogilvy:150>180:fall","will:240>360:run"],fx=["sparks","dust","alarm"],cam="wide"),
]),
("The Walkers",[
 S("wire","Urgent bulletin. More cylinders have fallen across the south. Troops are advancing on the common. All citizens are told to stay indoors.",["wire:300","will:60>190","catherine:100>160"],"bridge","dim",["hologram"],["glitch"],"wide"),
 S("catherine","Tell me the truth. Is it as bad as the wire says? You have not slept, and you will not look at me.",["catherine:160>210","will:190>140"],cam="close"),
 S("will","It is worse, Catherine. Ogilvy is dead. Whatever came out of that cylinder does not want to talk. We leave tonight, before the road is closed.",["will:140>200","catherine:210>260"],cam="medium"),
 S(N,"But the road was already closed. At dawn the first machines rose over the trees. Towers on three legs, taller than churches, striding across the fields like giants.",["tripod:380>250","will:60>110"],"ruins","dusk",[],["dust","sparks","alarm"],"low"),
 S("tripod","We have crossed the void. Your cities are small. Your weapons are small. Surrender, and be spared. Or run, and be counted.",["tripod:250>180","will:110>60"],fx=["dust","haze"],cam="low"),
 S("gunner","You there! Get down. It sees everything that moves in the open. Down, man, behind the wall, now!",["gunner:360>240:run","will:60>150:sneak"],"ruins","dusk",[],["dust","sparks"],"medium"),
 S(N,"They fell in behind a broken wall and watched the machines walk through the smoke. A bright beam swept the street, and the buildings opened like wet paper.",["gunner:240>200:sneak","will:150>120:sneak","tripod:380>300"],fx=["sparks","alarm","haze"],cam="wide"),
]),
("The Long Road",[
 S(N,"Catherine had reached the coast road before him, and he ran to find her. Behind the hedges the whole county was moving: carts, children, grandmothers, all walking away from the fire.",["will:40>260:run","catherine:300>230"],"planet","day",["crates"],["dust"],"orbit"),
 S("catherine","There is a steamer at the harbour taking women and children. You must come with me, please. Please.",["catherine:230>180","will:260>210"],cam="close"),
 S("will","I will put you on it, I promise. Then I will go back for the others. Walk with me. Keep walking, and do not look behind us.",["will:210>110","catherine:180>90"],cam="medium"),
 S("gunner","Walk to the harbour if you like. I say we go under the ground. Tunnels and sewers. We build a new city down there and strike back from the dark.",["gunner:360>200","will:60>130"],"corridor","night",["crates"],["haze"],"medium"),
 S("will","Under the ground. With what weapons? They burn whole streets in a breath. They cannot be fought. They can only be outlasted.",["will:130>240","gunner:200>130:shake"],cam="close"),
 S(N,"All that night the machines gathered people into their baskets. And where their breath of red smoke fell, a strange red weed crept over the fields and drank the rivers.",["tripod:380>240"],"ruins","night",[],["haze","glitch","sparks"],"high"),
 S(N,"At the harbour the last steamer was leaving. He lifted Catherine across the gap, and the ship pulled out into the fog, and she held up her hand until he lost her.",["catherine:300>360:wave","will:80>230:run"],"planet","dusk",["gate"],["haze"],"wide"),
]),
("The Silence",[
 S(N,"He walked back alone through a country that had stopped. No birds, no engines, only the red weed rustling around the ruins, and in the distance one machine standing very still.",["will:40>250"],"ruins","dusk",[],["dust","haze"],"orbit"),
 S("will","It is not moving. It has not moved all morning. And there is a sound coming from it, a long thin cry, falling and falling.",["will:250>180:sneak","gunner:380>300"],cam="medium"),
 S("gunner","It is a trap. It has to be a trap. You do not walk up to it. I am telling you, stay back, you do not walk up to that thing.",["gunner:300>240","will:180>110:sneak"],cam="close"),
 S(N,"But he did walk up to it. The hatch hung open. Inside, the grey creatures lay in their seats, crumpled and still, and the machine around them was only metal.",["will:110>200","tripod:360>260:fall"],"engine","dim",["crates"],["sparks","haze"],"in"),
 S("will","Dead. All of them. Not by a gun, and not by any fire of ours. Something smaller than the smallest dust has done this.",["will:200>130","gunner:300>200"],cam="close"),
 S(N,"The germs of our own world, to which we have been made strong by a million years of sickness. The Martians had crossed the void and had no defence against them at all.",["gunner:200>110:nod","will:130>240"],"ruins","day",[],["dust"],"high"),
 S("catherine","I read the news on the ship. They told us it was over. I did not believe them. I walked from the harbour, and I did not stop.",["catherine:380>200","will:100>180:wave"],"planet","day",["gate"],["dust"],"medium"),
]),
]
m={"schemaVersion":1,"slug":"the-war-of-the-worlds","title":"The War of the Worlds",
 "synopsis":"A village writer watches a cylinder fall from the sky and the world he knew burn behind three-legged machines. A retelling of H. G. Wells' classic story of invasion, escape and the smallest rescue of all.",
 "credit":"After H. G. Wells (public domain). Original script.",
 "genre":"Science fiction","style":"cinema","poster":"/posters/the-war-of-the-worlds.jpg","featured":True,
 "cover":{"place":"ruins","time":"dusk","props":[],"fx":["dust","sparks"],"characters":["tripod:270","will:120"],"camera":"low"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/the-war-of-the-worlds.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
