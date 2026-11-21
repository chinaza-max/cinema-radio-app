import json
cast={
 "emeka":{"name":"Emeka","role":"Medical equipment salesman","model":"toon","skin":"#6b4428","hair":"#161412","hairstyle":"short","coat":"#6b7a8f","coat2":"#e0e1dd","pants":"#2f3640","trim":"#e0e1dd","gear":"belt","build":"regular","tag":"#9db4d3","voice":"en-NG-AbeoNeural"},
 "dayo":{"name":"Dayo","role":"Emeka's young son","model":"toon","skin":"#7a4c2e","hair":"#0f0d0c","hairstyle":"afro","coat":"#ffb703","coat2":"#fb8500","pants":"#264653","trim":"#ffffff","gear":"headband","build":"slim","sc":0.62,"tag":"#ffd166","voice":"en-US-AnaNeural","pitch":1.5},
 "ngozi":{"name":"Ngozi","role":"Emeka's wife","model":"toon","skin":"#8a5a3a","hair":"#1a1210","hairstyle":"long","coat":"#c9184a","coat2":"#ff758f","pants":"#3a3a46","trim":"#ffe5ec","gear":"scarf","build":"slim","tag":"#ff8fa3","voice":"en-NG-EzinneNeural"},
 "adeyemi":{"name":"Mr. Adeyemi","role":"Stockbroker with a fast car","model":"toon","skin":"#4e3220","hair":"#111111","hairstyle":"bald","coat":"#1d3557","coat2":"#a8dadc","pants":"#14213d","trim":"#ffd166","gear":"coat,glasses","build":"stocky","tag":"#7aa2d6","voice":"en-GB-RyanNeural","pitch":0.9},
 "madam":{"name":"Madam Bello","role":"Head of the training programme","model":"toon","skin":"#7b4b2f","hair":"#2b1d16","hairstyle":"bun","coat":"#6a4c93","coat2":"#c8b6ff","pants":"#2b2d42","trim":"#c8b6ff","gear":"glasses,coat","build":"regular","tag":"#c8b6ff","voice":"en-GB-SoniaNeural"},
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
("The Machine Nobody Wanted",[
 S(N,"Emeka had spent every naira he had on portable scanners, small machines that could look inside a bone. He believed hospitals would queue for them. The hospitals did not.",["emeka:60>200","dayo:340"],"city","day",["bus"],["dust"],"wide"),
 S("emeka","Doctor, please. It is lighter, faster and cheaper than the old one. Just ten minutes, and you will see.",["emeka:200","adeyemi:330"],"corridor","day",[],[],"medium"),
 S("ngozi","Emeka, the rent is late, the shop is shouting, and your son needs shoes. I work double shifts, and you work on a dream. I am so tired.",["ngozi:300","emeka:150"],"city","dusk",[],["haze"],"medium"),
 S("emeka","One more month, Ngozi. Just one. I promise it will turn.",["emeka:150","ngozi:300"],cam="close"),
 S(N,"But the month passed, and the next one too. And one evening Ngozi packed a small bag and said she had found a job in another city, and could not carry them both.",["ngozi:300>360:run","dayo:200","emeka:140"],"city","night",[],["haze"],"wide"),
 S("adeyemi","You are staring at my car, young man. Go on, ask. Everyone does.",["adeyemi:320","emeka:110>200:run"],"city","dusk",["bus"],["dust"],"medium"),
 S("emeka","What do you do for a living, sir, that allows you to park a car like that?",["emeka:200","adeyemi:320"],cam="close"),
 S("adeyemi","I am a stockbroker. I help people grow their money. And the firm takes one intern every season. Only one.",["adeyemi:320","emeka:200"],cam="medium"),
]),
("An Interview in Yesterday's Shirt",[
 S(N,"The firm took only one intern, and it paid nothing at all. Twenty young graduates in sharp suits wanted that seat. Emeka had a son, a cracked phone and a shirt he had washed twice.",["emeka:60>220","dayo:340"],"corridor","day",[],[],"wide"),
 S(N,"The night before the interview, the police stopped him for parking fines he could not pay. He slept in a cell, and walked out at dawn straight to the tall glass door.",["emeka:60>180:run"],"city","dusk",[],["haze"],"wide"),
 S("madam","Mr. Emeka, you are wearing yesterday's shirt, and you are late by a minute. Please tell me why we should not simply send you home.",["madam:320","emeka:150"],"corridor","day",[],[],"medium"),
 S("emeka","Because I am honest about where I am coming from, Madam. And because whatever door you open for me, I will be the first one through it and the last one out.",["emeka:150","madam:320"],cam="close"),
 S("madam","Hmm. Honest, and stubborn. The training starts on Monday. Six months, no salary, and only one permanent place at the end.",["madam:320","emeka:150:nod"],cam="medium"),
 S(N,"He walked out into the street, thanked the sky, and walked straight back into the hardest six months of his life.",["emeka:150>260"],"city","day",[],["dust"],"wide"),
]),
("Where Father and Son Slept",[
 S(N,"Rent was due, and rent went unpaid. One morning the landlord changed the lock, and Emeka and little Dayo stood on the pavement with two bags and a scanner in a box.",["emeka:200","dayo:250"],"city","dusk",[],["haze"],"medium"),
 S("dayo","Papa, are we going on a trip? Is this a game, like you said? Are we pretending?",["dayo:250","emeka:200"],cam="close"),
 S("emeka","Yes, my son. It is a game, and we are winning it. Hold my hand tight.",["emeka:200","dayo:250"],cam="close"),
 S(N,"Some nights, they slept in a shelter. Some nights, they did not sleep at all. One night, Emeka locked himself and his son into a tiny station bathroom, held the door shut with his foot, and cried silently so the boy would not hear.",["emeka:200","dayo:250"],"corridor","night",[],[],"low"),
 S(N,"But every morning he washed his one good shirt, and he was at his desk before anyone else, making calls without stopping for water, so that he would never lose a minute to anyone.",["emeka:60>200:run"],"corridor","day",[],[],"wide"),
 S("madam","Mr. Emeka. Tomorrow I decide. One place, twenty of you. Please be in my office at nine.",["madam:320","emeka:200"],cam="medium"),
 S(N,"Emeka did not sleep that night. He held his son, watched the street lights, and counted every sacrifice one more time.",["emeka:200","dayo:250"],"city","night",[],["haze"],"low"),
 S("madam","Mr. Emeka, you have done something none of the others did. You never made excuses. The place is yours. Welcome to the firm.",["madam:320","emeka:200"],"corridor","day",[],[],"close"),
 S(N,"He walked out slowly, and then he stood in the middle of the busy street, clapping with tears running down his face, while the whole city rushed past him. Years later, he would open a firm of his own, and keep one seat free every season for someone who had nothing. The end.",["emeka:200","dayo:260:wave"],"city","dusk",[],["dust","sparks"],"orbit"),
]),
]
calm=lambda: None
m={"schemaVersion":1,"slug":"the-long-way-up","title":"The Long Way Up",
 "synopsis":"A salesman in Lagos with a machine nobody wants, a young son and no home chases one unpaid internship, and the only permanent seat at the end of it. An original story about refusing to give up, inspired by true-life stories of people who rose from nothing.",
 "credit":"Original story and characters.",
 "genre":"Drama","style":"cinema","poster":"/posters/the-long-way-up.jpg","featured":True,
 "cover":{"place":"city","time":"dusk","props":[],"fx":["dust"],"characters":["dayo:170","emeka:230"],"camera":"wide"},
 "cast":cast,"episodes":[{"title":t,"scenes":s} for t,s in eps]}
json.dump(m,open('seed/movies/the-long-way-up.json','w'),indent=2)
print(sum(len(s) for _,s in eps),'scenes')
