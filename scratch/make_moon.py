import json
cast={
 "barbicane":{"name":"Impey Barbicane","role":"President of the Gun Club","coat":"#9aa5b1","tag":"#c3cdd8","model":"soldier","voice":"en-US-GuyNeural","pitch":0.92},
 "nicholl":{"name":"Captain Nicholl","role":"Maker of armour plate","coat":"#b4bcc6","tag":"#dfe5ec","model":"android","voice":"en-GB-RyanNeural","pitch":0.95,"rate":0.97},
 "ardan":{"name":"Michel Ardan","role":"Adventurer from Paris","coat":"#c8553d","tag":"#ff8a6b","model":"avatar","voice":"en-US-ChristopherNeural"},
 "ada":{"name":"Dr. Ada Laurent","role":"Flight surgeon","coat":"#f2c14e","tag":"#ffcf6b","model":"michelle","voice":"en-GB-SoniaNeural"},
 "diana":{"name":"Diana","role":"Mission mascot","coat":"#4aa3df","tag":"#7fc4ee","model":"robot","voice":"en-US-JennyNeural","pitch":1.6,"rate":1.1},
 "moonface":{"name":"The Man in the Moon","role":"Keeper of the silver world","coat":"#cfe6ff","tag":"#e0f0ff","model":"hologram","voice":"en-NG-EzinneNeural"},
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
("The Great Gun",[
 S(N,"For as long as people have looked up, the Moon has looked back. Silver, silent, and just far enough away to seem impossible.",[],"space","night",[],["streaks"],"orbit"),
 S(N,"After a long war, the engineers of the Baltimore Gun Club had nothing left to build. Their president, Impey Barbicane, called them together with a plan so large it frightened even them.",["barbicane:60>160","nicholl:340>250"],"engine","day",["crates"],["sparks","haze"],"wide"),
 S("barbicane","Gentlemen, we will build a cannon half a mile long, sunk into the ground. And we will fire a shell at the Moon. With people inside.",["barbicane:160>200:point","nicholl:250>300"],cam="medium"),
 S("nicholl","Impossible. I make armour. I know what metal can bear, and no shell can survive a gun like that. I will bet you three thousand dollars it cracks.",["nicholl:300>230","barbicane:200>150"],cam="close"),
 S("barbicane","Then I will take that bet, Captain, and I will win it from the other side of the sky. Come and watch me dig the hole.",["barbicane:150>250","nicholl:230>330:nod"],cam="medium"),
 S(N,"They dug for a year in the sands of Florida. A shaft as deep as a mountain, lined with iron, and a shell of polished metal waiting beside it, bright as a coin.",["barbicane:60>130","nicholl:300>230"],"planet","day",["pod"],["dust","haze"],"low"),
 S(N,"Then a boat arrived with a stranger from Paris, who leapt out onto the dock before it had even stopped, and began to run.",["ardan:380>180:run","barbicane:80>120"],fx=["dust"],cam="wide"),
]),
("The Stranger from Paris",[
 S("ardan","Make room, my friends! I heard that you are building a ship for the Moon, and I refuse to be left behind. Michel Ardan, at your service. One passenger. Very curious.",["ardan:200>130:wave","barbicane:300>240"],"planet","day",["pod"],["dust"],"medium"),
 S("nicholl","You are mad. The journey will take four days with no air but what we carry. There is no way home but through a cannon in reverse.",["nicholl:360>290","ardan:130>210"],cam="close"),
 S("ardan","Captain, a man who does not believe in the impossible has never really tried to live. Besides, I brought tobacco and cheese. What else does a person need?",["ardan:210>260:nod","nicholl:290>220:shake"],cam="medium"),
 S("barbicane","He is right about one thing. This is not a trip for soldiers alone. We need a doctor, someone who understands the body in the dark between worlds.",["barbicane:100>200","nicholl:300>250"],cam="medium"),
 S("ada","Then I am your doctor. Ada Laurent. I have studied how bodies fail in the cold and the quiet. I do not intend to let any of you do it.",["ada:380>270","barbicane:200>150"],cam="low"),
 S(N,"They climbed into the shell, one by one, and sealed the hatch. Four people, one small robot called Diana, a library, and a crate of tobacco and cheese.",["barbicane:60>120","ada:330>250","diana:380>300"],"engine","dim",["pod"],["haze"],"in"),
 S(N,"The countdown began. Above the sand, the whole world held its breath, and the great gun pointed at the sky.",["ardan:100>180:wave","diana:300>230:run"],"planet","dusk",["pod"],["alarm","dust","sparks"],"low"),
]),
("Between Two Worlds",[
 S(N,"The gun fired, and the sound was heard on every shore. For one moment the shell was a streak of fire, and then it was silence, and then it was the stars.",[],"space","night",[],["streaks"],"orbit"),
 S("ardan","Is everyone alive? I think I am alive. I have never felt so light. Doctor, are my feet on the floor, or is the floor on my feet?",["ardan:80>200","ada:340>250"],"bridge","dim",["hologram"],["dust"],"medium"),
 S("ada","Hold on to something, Michel, and breathe slowly. Your body has nothing to push against. Diana, stay close to the hatch, please.",["ada:250>170","diana:350>260"],cam="close"),
 S("nicholl","I owe Barbicane three thousand dollars. The shell did not crack. I have never been so pleased to lose a bet.",["nicholl:360>260:nod","barbicane:80>150"],cam="medium"),
 S(N,"Then the window flared red. A shower of meteors was racing past the shell, tiny stones moving faster than any bullet, and every one of them aimed at the crew.",["barbicane:150>260:run","ada:170>110:run"],"bridge","alert",["hologram"],["alarm","streaks"],"in"),
 S("barbicane","Everyone down! Keep clear of the glass. Nicholl, the shutters, now! If we hold our course, the Moon will catch us before the stones can.",["barbicane:260>200:point","nicholl:300>230"],cam="medium"),
 S(N,"The stones passed. In the window, the Earth turned slowly, blue and small, and beyond it the Moon grew until it filled the sky.",["ardan:150>230","ada:90>170","diana:320>260"],"bridge","dim",["hologram"],["dust"],"wide"),
]),
("The Silver World",[
 S(N,"The shell touched down so softly that the crew hardly felt it. Outside, the sky was black at noon, and the ground was the colour of ash.",["barbicane:60>150"],"moon","day",[],["dust"],"orbit"),
 S("ardan","I will go first. I am the one who ate the cheese, so I have earned it. A small step for a man, a giant leap for his reputation.",["ardan:100>230:wave","ada:330>260","diana:360>300"],cam="low"),
 S("ada","Wait, Michel. Look at the footprints, they do not blow away. And listen. There is no wind, no sound at all. This world has been waiting for us.",["ada:260>160:point","ardan:230>300"],cam="medium"),
 S("moonface","Welcome, small travellers. I am the face you have drawn in my craters for ten thousand years. You are the first to answer, and I am glad.",["moonface:340","ardan:90>200","ada:160>110"],props=[],fx=["glitch"],cam="wide"),
 S("barbicane","We came to touch you, and we have. But we left a world behind us that is waiting to hear that this was possible. May we go home?",["barbicane:100>200","nicholl:360>290"],fx=["dust"],cam="medium"),
 S("moonface","Go, and tell them that the Moon is not a wall but a door. Others will come. Look up tonight, and I will wave back.",["moonface:340","nicholl:100>200:nod","ardan:230>150:wave"],fx=["glitch"],cam="wide"),
 S(N,"The shell fell home and splashed down in a warm blue sea, and the people who looked up that night saw the Moon in a different way, as a place with footprints in it.",[],"space","night",[],["streaks"],"out"),
]),
]
m={"schemaVersion":1,"slug":"journey-to-the-moon","title":"Journey to the Moon",
 "synopsis":"A rival's bet, a cannon half a mile long, and a crew of four with one small robot. A retelling of Jules Verne's tale of the first voyage to the Moon, with a rotating Earth, falling stars and a face in the craters.",
 "credit":"After Jules Verne (public domain). Original script.",
 "genre":"Science fiction","style":"cinema","poster":"/posters/journey-to-the-moon.jpg","featured":True,
 "cover":{"place":"moon","time":"day","props":[],"fx":["dust"],"characters":["ada:130","ardan:260"],"camera":"low"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/journey-to-the-moon.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
