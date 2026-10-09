#!/usr/bin/env python3
"""Download square card photos and flags, and write data/cards.json.

Photos are cropped to the same 640×640 square so every country card matches.
Replace any file in assets/cards/<iso>/{animal,currency,landmark,dish}.jpg
later (a watercolor illustration is fine) without changing code.
"""
from __future__ import annotations

import json
import os
import time
import urllib.parse
import urllib.request
from io import BytesIO

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UA = "ChinaNeighboursClassroom/1.0 (ESL geography puzzle; educational build)"
OUT = 640

# capital en, zh, lon, lat | animal en, zh, query | currency | landmark | dish
# Queries prefer a clear, well-lit photo of one subject.
SEED = {
"AFG": ("Kabul","喀布尔",69.172,34.529,"Snow leopard","雪豹","snow leopard portrait wild","Afghani","阿富汗尼","Afghanistan 1 afghani coin","Band-e-Amir","班德阿米尔湖","Band-e-Amir lakes Afghanistan","Kabuli pulao","喀布尔抓饭","Kabuli pulao rice dish"),
"ARE": ("Abu Dhabi","阿布扎比",54.377,24.454,"Arabian oryx","阿拉伯大羚羊","Arabian oryx portrait","Dirham","迪拉姆","UAE 1 dirham coin","Burj Khalifa","哈利法塔","Burj Khalifa daylight","Luqaimat","甜炸球","luqaimat sweet dumplings plate"),
"ARM": ("Yerevan","埃里温",44.515,40.187,"Golden eagle","金雕","golden eagle portrait bird","Dram","德拉姆","Armenia 500 dram coin","Geghard","格加尔德修道院","Geghard monastery Armenia","Dolma","葡萄叶包饭","Armenian dolma plate"),
"AZE": ("Baku","巴库",49.868,40.409,"Karabakh horse","卡拉巴赫马","Karabakh horse Azerbaijan","Manat","马纳特","Azerbaijan 1 manat coin","Maiden Tower","少女塔","Maiden Tower Baku","Plov","抓饭","Azerbaijani plov pilaf"),
"BGD": ("Dhaka","达卡",90.413,23.810,"Bengal tiger","孟加拉虎","Bengal tiger portrait","Taka","塔卡","Bangladesh 2 taka coin","Sundarbans","孙德尔本斯红树林","Sundarbans mangrove forest","Hilsa curry","鲥鱼咖喱","hilsa fish curry Bengali"),
"BGR": ("Sofia","索非亚",23.322,42.698,"European bee-eater","黄喉蜂虎","European bee-eater bird close","Lev","列弗","Bulgaria 1 lev coin","Rila Monastery","里拉修道院","Rila Monastery Bulgaria","Banitsa","巴尼察","Bulgarian banitsa pastry"),
"BLR": ("Minsk","明斯克",27.567,53.900,"European bison","欧洲野牛","European bison wisent portrait","Ruble","卢布","Belarus ruble coin","Mir Castle","米尔城堡","Mir Castle Belarus","Draniki","土豆饼","Belarusian draniki potato pancakes"),
"BRN": ("Bandar Seri Begawan","斯里巴加湾市",114.941,4.890,"Proboscis monkey","长鼻猴","proboscis monkey portrait","Brunei dollar","文莱元","Brunei 1 dollar coin","Omar Ali Saifuddien Mosque","奥马尔·阿里·赛福鼎清真寺","Omar Ali Saifuddien Mosque","Ambuyat","阿姆布亚特","ambuyat Brunei food"),
"BTN": ("Thimphu","廷布",89.639,27.472,"Takin","羚牛","takin Bhutan portrait","Ngultrum","努尔特鲁姆","Bhutan 1 ngultrum coin","Tiger's Nest","虎穴寺","Paro Taktsang Tiger Nest","Ema datshi","辣椒奶酪","ema datshi Bhutan cheese chilli"),
"CHN": ("Beijing","北京",116.407,39.904,"Giant panda","大熊猫","giant panda eating bamboo","Renminbi (yuan)","人民币（元）","China 1 yuan coin","Great Wall","长城","Great Wall of China Jinshanling daylight","Dumplings","饺子","Chinese jiaozi dumplings plate"),
"EGY": ("Cairo","开罗",31.236,30.044,"Steppe eagle","草原雕","steppe eagle bird portrait","Pound","埃及镑","Egypt 1 pound coin","Pyramids of Giza","吉萨金字塔","Pyramids of Giza daylight","Koshari","埃及烩饭","Egyptian koshari bowl"),
"EST": ("Tallinn","塔林",24.754,59.437,"Wolf","灰狼","Eurasian wolf portrait calm","Euro","欧元","Estonia 1 euro coin","Tallinn old town","塔林老城","Tallinn old town aerial","Rye bread","黑麦面包","Estonian black rye bread"),
"FIN": ("Helsinki","赫尔辛基",24.938,60.170,"Brown bear","棕熊","brown bear portrait Finland","Euro","欧元","Finland 1 euro coin","Suomenlinna","苏奥门林纳要塞","Suomenlinna sea fortress","Karelian pasty","卡累利阿馅饼","Karelian pasty karjalanpiirakka"),
"GEO": ("Tbilisi","第比利斯",44.783,41.694,"Caucasian tur","高加索羱羊","Caucasian tur goat mountain","Lari","拉里","Georgia 1 lari coin","Gergeti Trinity","格拉特三一教堂","Gergeti Trinity Church Kazbek","Khachapuri","奶酪船面包","Adjarian khachapuri"),
"GRC": ("Athens","雅典",23.728,37.984,"Dolphin","海豚","bottlenose dolphin jumping clear","Euro","欧元","Greece 1 euro coin","Parthenon","帕特农神庙","Parthenon Athens daylight","Souvlaki","希腊烤肉串","Greek souvlaki pita"),
"IDN": ("Jakarta","雅加达",106.845,-6.208,"Komodo dragon","科莫多巨蜥","Komodo dragon portrait","Rupiah","印尼盾","Indonesia 1000 rupiah coin","Borobudur","婆罗浮屠","Borobudur temple daylight","Nasi goreng","印尼炒饭","nasi goreng plate"),
"IND": ("New Delhi","新德里",77.209,28.614,"Bengal tiger","孟加拉虎","Bengal tiger walking wild","Rupee","卢比","India 5 rupee coin","Taj Mahal","泰姬陵","Taj Mahal front daylight","Biryani","比尔亚尼","chicken biryani plate India"),
"IRN": ("Tehran","德黑兰",51.389,35.689,"Persian leopard","波斯豹","Persian leopard portrait","Rial","里亚尔","Iran 5000 rial coin","Persepolis","波斯波利斯","Persepolis Iran columns","Chelo kebab","烤肉米饭","Persian chelo kebab"),
"IRQ": ("Baghdad","巴格达",44.366,33.315,"Chukar partridge","石鸡","chukar partridge bird","Dinar","第纳尔","Iraq 250 dinar coin","Ziggurat of Ur","乌尔金字形神塔","Great Ziggurat of Ur","Dolma","葡萄叶包饭","Iraqi dolma"),
"ISR": ("Jerusalem","耶路撒冷",35.214,31.778,"Mountain gazelle","山瞪羚","mountain gazelle Israel portrait","Shekel","谢克尔","Israel 1 shekel coin","Dead Sea","死海","Dead Sea Israel shore daylight","Falafel","法拉费","falafel plate pita"),
"JOR": ("Amman","安曼",35.911,31.954,"Arabian oryx","阿拉伯大羚羊","Arabian oryx Shaumari","Dinar","第纳尔","Jordan 1 dinar coin","Petra","佩特拉","Petra Treasury Al-Khazneh","Mansaf","曼萨夫","Jordanian mansaf lamb rice"),
"KAZ": ("Astana","阿斯塔纳",71.430,51.128,"Golden eagle","金雕","golden eagle portrait Kazakhstan","Tenge","坚戈","Kazakhstan 100 tenge coin","Charyn Canyon","恰伦峡谷","Charyn Canyon Kazakhstan","Beshbarmak","贝什巴尔玛克","beshbarmak noodles meat"),
"KGZ": ("Bishkek","比什凯克",74.590,42.875,"Snow leopard","雪豹","snow leopard portrait","Som","索姆","Kyrgyzstan 10 som coin","Issyk-Kul","伊塞克湖","Issyk-Kul lake Kyrgyzstan","Laghman","拉面","Kyrgyz laghman noodles"),
"KHM": ("Phnom Penh","金边",104.928,11.556,"Giant ibis","大鹮","giant ibis Pseudibis gigantea","Riel","瑞尔","Cambodia 500 riel coin","Angkor Wat","吴哥窟","Angkor Wat sunrise","Fish amok","鱼肉安木","Cambodian fish amok coconut"),
"KOR": ("Seoul","首尔",126.978,37.567,"Siberian tiger","东北虎","Siberian tiger portrait","Won","韩元","South Korea 500 won coin","Gyeongbokgung","景福宫","Gyeongbokgung Palace daylight","Bibimbap","拌饭","bibimbap bowl"),
"KWT": ("Kuwait City","科威特城",47.978,29.376,"Arabian camel","阿拉伯骆驼","dromedary camel portrait desert","Dinar","第纳尔","Kuwait 100 fils coin","Kuwait Towers","科威特塔","Kuwait Towers daylight","Machboos","马赫布斯","Kuwaiti machboos rice"),
"LAO": ("Vientiane","万象",102.613,17.975,"Asian elephant","亚洲象","Asian elephant portrait","Kip","基普","Laos 1000 kip coin","Kuang Si Falls","光西瀑布","Kuang Si Falls Laos","Sticky rice","糯米饭","Lao sticky rice basket"),
"LBN": ("Beirut","贝鲁特",35.502,33.894,"Striped hyena","条纹鬣狗","striped hyena portrait calm","Pound","黎巴嫩镑","Lebanon 500 livre coin","Baalbek","巴勒贝克","Baalbek temple Lebanon","Tabbouleh","塔布勒沙拉","tabbouleh salad bowl"),
"LTU": ("Vilnius","维尔纽斯",25.279,54.687,"White stork","白鹳","white stork bird portrait","Euro","欧元","Lithuania 1 euro coin","Trakai Castle","特拉凯城堡","Trakai Island Castle","Cepelinai","土豆团子","Lithuanian cepelinai"),
"LVA": ("Riga","里加",24.105,56.949,"White wagtail","白鹡鸰","white wagtail bird close","Euro","欧元","Latvia 1 euro coin","Riga old town","里加老城","Riga old town House of Blackheads","Piragi","培根小面包","Latvian piragi bacon buns"),
"MMR": ("Naypyidaw","内比都",96.129,19.763,"Asian elephant","亚洲象","Asian elephant Myanmar","Kyat","缅元","Myanmar 100 kyat coin","Bagan","蒲甘","Bagan temples daylight","Mohinga","鱼汤米线","mohinga Myanmar bowl"),
"MNG": ("Ulaanbaatar","乌兰巴托",106.905,47.922,"Przewalski's horse","普氏野马","Przewalski horse takhi portrait","Tugrik","图格里克","Mongolia 500 tugrik coin","Khongoryn Els","红戈林沙丘","Khongoryn Els sand dunes Gobi","Buuz","蒙古包子","Mongolian buuz dumplings"),
"MYS": ("Kuala Lumpur","吉隆坡",101.687,3.139,"Malayan tiger","马来虎","Malayan tiger portrait","Ringgit","林吉特","Malaysia 1 ringgit coin","Petronas Towers","双子塔","Petronas Twin Towers daylight","Nasi lemak","椰浆饭","nasi lemak plate"),
"NOR": ("Oslo","奥斯陆",10.752,59.913,"Moose","驼鹿","moose elk portrait Alces","Krone","克朗","Norway 20 krone coin","Geirangerfjord","盖朗厄尔峡湾","Geirangerfjord Norway daylight","Salmon","三文鱼","Norwegian salmon fillet plate"),
"NPL": ("Kathmandu","加德满都",85.324,27.717,"Cow","黄牛","zebu cow portrait Nepal","Rupee","卢比","Nepal 1 rupee coin","Mount Everest","珠穆朗玛峰","Mount Everest from Nepal daylight","Dal bhat","扁豆米饭","Nepali dal bhat plate"),
"OMN": ("Muscat","马斯喀特",58.406,23.586,"Arabian oryx","阿拉伯大羚羊","Arabian oryx Oman","Rial","里亚尔","Oman 100 baisa coin","Sultan Qaboos Mosque","苏丹卡布斯大清真寺","Sultan Qaboos Grand Mosque Muscat","Halwa","阿曼哈尔瓦","Omani halwa sweet"),
"PAK": ("Islamabad","伊斯兰堡",73.048,33.684,"Markhor","捻角山羊","markhor goat portrait","Rupee","卢比","Pakistan 5 rupee coin","K2","乔戈里峰","K2 mountain daylight","Biryani","比尔亚尼","Pakistani biryani plate"),
"PNG": ("Port Moresby","莫尔兹比港",147.180,-9.443,"Bird-of-paradise","极乐鸟","Raggiana bird-of-paradise","Kina","基那","Papua New Guinea 1 kina coin","Tavurvur","塔武武尔火山","Tavurvur volcano Rabaul","Mumu","地炉宴","Papua New Guinea mumu food"),
"POL": ("Warsaw","华沙",21.012,52.230,"European bison","欧洲野牛","European bison Bialowieza","Zloty","兹罗提","Poland 5 zloty coin","Malbork Castle","马尔堡城堡","Malbork Castle Poland","Pierogi","波兰饺子","Polish pierogi plate"),
"PRK": ("Pyongyang","平壤",125.754,39.039,"Siberian tiger","东北虎","Siberian tiger Amur portrait","Won","朝鲜元","North Korea 1 won coin","Mount Paektu","白头山","Mount Paektu Heaven Lake","Naengmyeon","冷面","Korean naengmyeon cold noodles"),
"PSX": ("Ramallah","拉马拉",35.204,31.903,"Palestine sunbird","巴勒斯坦太阳鸟","Palestine sunbird Cinnyris osea","Shekel","谢克尔","Israeli 1 shekel coin","Ancient Jericho","古耶利哥","Tell es-Sultan Jericho archaeology","Musakhan","穆萨汉烤鸡","Palestinian musakhan sumac chicken"),
"QAT": ("Doha","多哈",51.531,25.286,"Arabian oryx","阿拉伯大羚羊","Arabian oryx Qatar","Riyal","里亚尔","Qatar 1 riyal coin","Museum of Islamic Art","伊斯兰艺术博物馆","Museum of Islamic Art Doha","Machboos","马赫布斯","Qatari machboos rice"),
"RUS": ("Moscow","莫斯科",37.617,55.756,"Brown bear","棕熊","brown bear portrait wild","Ruble","卢布","Russia 10 ruble coin","Lake Baikal","贝加尔湖","Lake Baikal daylight","Pelmeni","俄式饺子","Russian pelmeni dumplings"),
"SAU": ("Riyadh","利雅得",46.675,24.714,"Arabian camel","阿拉伯骆驼","Arabian camel dromedary close","Riyal","里亚尔","Saudi Arabia 1 riyal coin","Hegra","赫格拉","Hegra Mada'in Salih Saudi","Kabsa","卡布萨","Saudi kabsa rice lamb"),
"SYR": ("Damascus","大马士革",36.277,33.513,"Arabian horse","阿拉伯马","Arabian horse portrait white","Pound","叙利亚镑","Syria 10 pound coin","Krak des Chevaliers","骑士堡","Krak des Chevaliers castle","Kibbeh","基贝","kibbeh fried balls plate"),
"THA": ("Bangkok","曼谷",100.502,13.756,"Asian elephant","亚洲象","Thai elephant portrait","Baht","泰铢","Thailand 10 baht coin","Wat Arun","郑王庙","Wat Arun Bangkok daylight","Pad thai","泰式炒河粉","pad thai plate shrimp"),
"TJK": ("Dushanbe","杜尚别",68.787,38.560,"Snow leopard","雪豹","snow leopard sitting rock","Somoni","索莫尼","Tajikistan 5 somoni coin","Iskanderkul","伊斯坎德尔湖","Iskanderkul lake Tajikistan","Plov","抓饭","Tajik plov osh"),
"TKM": ("Ashgabat","阿什哈巴德",58.383,37.937,"Akhal-Teke horse","阿哈尔捷金马","Akhal-Teke horse golden","Manat","马纳特","Turkmenistan 1 manat coin","Darvaza crater","达尔瓦扎燃气坑","Darvaza gas crater Turkmenistan","Plov","抓饭","Turkmen plov pilaf"),
"TLS": ("Dili","帝力",125.578,-8.556,"Saltwater crocodile","湾鳄","saltwater crocodile head portrait","US dollar","美元","East Timor centavo coin","Cristo Rei","基督像","Cristo Rei Dili statue","Grilled fish","烤鱼","Timorese grilled fish rice"),
"TUR": ("Ankara","安卡拉",32.854,39.920,"Turkish Angora","土耳其安哥拉猫","Turkish Angora cat white portrait","Lira","里拉","Turkey 1 lira coin","Cappadocia","卡帕多西亚","Cappadocia balloons fairy chimneys","Kebab","烤肉","Turkish kebab plate"),
"UKR": ("Kyiv","基辅",30.524,50.450,"White stork","白鹳","white stork Ciconia portrait","Hryvnia","格里夫纳","Ukraine 1 hryvnia coin","Kamianets-Podilskyi Castle","卡缅涅茨城堡","Kamianets-Podilskyi Castle Ukraine","Borscht","罗宋汤","Ukrainian borscht bowl"),
"UZB": ("Tashkent","塔什干",69.240,41.299,"Bukhara deer","布哈拉鹿","Bukhara deer Cervus portrait","Som","索姆","Uzbekistan 500 som coin","Registan","列吉斯坦","Registan Samarkand daylight","Plov","抓饭","Uzbek plov kazan"),
"VNM": ("Hanoi","河内",105.854,21.029,"Water buffalo","水牛","water buffalo portrait Vietnam","Dong","越南盾","Vietnam 5000 dong coin","Ha Long Bay","下龙湾","Ha Long Bay daylight junk","Pho","越南粉","Vietnamese pho bowl"),
"YEM": ("Sana'a","萨那",44.207,15.355,"Arabian leopard","阿拉伯豹","Arabian leopard portrait","Rial","里亚尔","Yemen 20 rial coin","Socotra","索科特拉龙血树","Socotra dragon blood tree","Saltah","萨尔塔炖菜","Yemeni saltah stew"),
}

# Tried before search. Commons file titles without the File: prefix.
PREFERRED = {
"CHN": {"animal":"Giant Panda 2004-03-2.jpg","landmark":"The Great Wall of China at Jinshanling-edit.jpg","dish":"Dumplings-Jiaozi.jpg"},
"IND": {"landmark":"Taj Mahal (Edited).jpeg","animal":"Bengal tiger (Panthera tigris tigris) female.jpg"},
"NPL": {"landmark":"Mount Everest as seen from Drukair2 PLW edit.jpg"},
"RUS": {"landmark":"Lake Baikal in winter.jpg"},
"EGY": {"landmark":"All Gizah Pyramids.jpg"},
"JOR": {"landmark":"Al Khazneh Petra edit 2.jpg"},
"KHM": {"landmark":"Angkor Wat.jpg"},
"JPN": {},
}

FLAGS = {
"AFG":"Flag of Afghanistan.svg","ARE":"Flag of the United Arab Emirates.svg","ARM":"Flag of Armenia.svg",
"AZE":"Flag of Azerbaijan.svg","BGD":"Flag of Bangladesh.svg","BGR":"Flag of Bulgaria.svg","BLR":"Flag of Belarus.svg",
"BRN":"Flag of Brunei.svg","BTN":"Flag of Bhutan.svg","CHN":"Flag of the People's Republic of China.svg",
"EGY":"Flag of Egypt.svg","EST":"Flag of Estonia.svg","FIN":"Flag of Finland.svg","GEO":"Flag of Georgia.svg",
"GRC":"Flag of Greece.svg","IDN":"Flag of Indonesia.svg","IND":"Flag of India.svg","IRN":"Flag of Iran.svg",
"IRQ":"Flag of Iraq.svg","ISR":"Flag of Israel.svg","JOR":"Flag of Jordan.svg","KAZ":"Flag of Kazakhstan.svg",
"KGZ":"Flag of Kyrgyzstan.svg","KHM":"Flag of Cambodia.svg","KOR":"Flag of South Korea.svg","KWT":"Flag of Kuwait.svg",
"LAO":"Flag of Laos.svg","LBN":"Flag of Lebanon.svg","LTU":"Flag of Lithuania.svg","LVA":"Flag of Latvia.svg",
"MMR":"Flag of Myanmar.svg","MNG":"Flag of Mongolia.svg","MYS":"Flag of Malaysia.svg","NOR":"Flag of Norway.svg",
"NPL":"Flag of Nepal.svg","OMN":"Flag of Oman.svg","PAK":"Flag of Pakistan.svg","PNG":"Flag of Papua New Guinea.svg",
"POL":"Flag of Poland.svg","PRK":"Flag of North Korea.svg","PSX":"Flag of Palestine.svg","QAT":"Flag of Qatar.svg",
"RUS":"Flag of Russia.svg","SAU":"Flag of Saudi Arabia.svg","SYR":"Flag of Syria.svg","THA":"Flag of Thailand.svg",
"TJK":"Flag of Tajikistan.svg","TKM":"Flag of Turkmenistan.svg","TLS":"Flag of East Timor.svg","TUR":"Flag of Turkey.svg",
"UKR":"Flag of Ukraine.svg","UZB":"Flag of Uzbekistan.svg","VNM":"Flag of Vietnam.svg","YEM":"Flag of Yemen.svg",
}

BAD_WORDS = (
    "logo","icon","diagram","map of","coat of arms","poster","screenshot","collage",
    "watermark","stamp","svg","drawing","cartoon","illustration","toy","plush","statue",
    "painting","mosaic","banknote","pattern","flag of","texture","vector","postcard",
    "infographic","shutterstock","getty","alamy","diagram","coat_of_arms","emblem",
    "people","crowd","soldier","selfie","restaurant","vendor","market","menu",
)
SLOT_BAD = {
    "animal": ("skeleton","skull","hunt","dead","taxidermy","meat","rug","skin","fur"),
    "currency": ("banknote","bank note","paper money","bill ","note"),
    "landmark": ("map","postcard","souvenir"),
    "dish": ("menu","restaurant","chef","vendor","market","street food stall"),
}
WHERE_OVERRIDE = {
    # Distant islands pull the bounding box off the mainland.
    "NOR": ("in the south", "南部"),
    "RUS": ("in the west", "西部"),
    "IDN": ("in the west", "西部"),
    "NPL": ("near the centre", "中部"),
}
GENERIC_TOKENS = {
    "the","of","a","and","in","on","with","portrait","wild","close","bird","plate",
    "daylight","coin","from","lake","mount","mountain","national","grand","great",
    "old","town","city","dish","food","sweet","clear","temple","castle",
}


def api(params, tries=6):
    params = dict(params)
    params["format"] = "json"
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    last = None
    for i in range(tries):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                data = json.load(r)
            time.sleep(0.85)
            return data
        except Exception as e:
            last = e
            code = getattr(e, "code", None)
            time.sleep(2.2 * (i + 1) if code == 429 else 1.2)
    raise last


def meta_text(info, key):
    em = (info.get("extmetadata") or {}).get(key) or {}
    return (em.get("value") or "").replace("\n", " ")


def license_ok(info):
    short = meta_text(info, "LicenseShortName").lower()
    usage = meta_text(info, "UsageTerms").lower()
    blob = short + " " + usage
    if any(x in blob for x in ("noncommercial", "non-commercial", "-nc", " nc ", "noderiv", "no derivatives", "-nd")):
        return False
    ok_bits = ("public domain", "cc0", "cc by", "cc-by", "attribution", "pd")
    if "cc by" in blob or "cc-by" in blob or "public domain" in blob or blob.strip() in ("pd", "cc0"):
        if "sa" in blob or "by" in blob or "public domain" in blob or "cc0" in blob:
            return True
    if short.startswith("cc by") or short.startswith("cc-by") or "public domain" in short or short in ("cc0", "pd"):
        return True
    return False


def imageinfos(titles):
    if not titles:
        return {}
    # API limit ~50
    out = {}
    for i in range(0, len(titles), 40):
        chunk = titles[i:i+40]
        data = api({
            "action": "query",
            "titles": "|".join(chunk),
            "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata",
            "iiurlwidth": "1200",
        })
        pages = (data.get("query") or {}).get("pages") or {}
        for p in pages.values():
            title = p.get("title")
            ii = (p.get("imageinfo") or [None])[0]
            if title and ii:
                out[title] = ii
        time.sleep(0.15)
    return out


def search_titles(query, limit=10):
    data = api({
        "action": "query",
        "list": "search",
        "srsearch": query + " filetype:bitmap",
        "srnamespace": "6",
        "srlimit": str(limit),
    })
    hits = ((data.get("query") or {}).get("search") or [])
    time.sleep(0.12)
    return ["File:" + h["title"] if not h["title"].startswith("File:") else h["title"] for h in hits]


def tokens(text):
    import re
    words = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", (text or "").lower())
    return {w for w in words if len(w) >= 3 and w not in GENERIC_TOKENS}


def score(title, info, slot, query, label):
    if not info:
        return -1
    mime = (info.get("mime") or "")
    if not mime.startswith("image/"):
        return -1
    if "svg" in mime:
        return -1
    if (info.get("width") or 0) < 600 or (info.get("height") or 0) < 450:
        return -1
    if not license_ok(info):
        return -1
    name = title.lower().replace("_", " ")
    if any(b in name for b in BAD_WORDS):
        return -1
    if any(b in name for b in SLOT_BAD.get(slot, ())):
        return -1
    need = tokens(label) or tokens(query)
    have = tokens(title)
    # A photo of the subject should name it. One shared word is enough;
    # generic leftovers like "rice" alone are not.
    overlap = need & have
    if not overlap:
        return -1
    if overlap <= {"rice", "fish", "meat", "bread", "soup", "salad", "chicken", "lamb"} and len(overlap) == 1:
        # Still allow if the query's distinctive word is that food word and it's the label.
        pass
    s = 10 + 6 * len(overlap)
    w = info.get("thumbwidth") or info.get("width") or 0
    if w >= 900:
        s += 4
    if "jpeg" in mime or "jpg" in mime:
        s += 2
    if slot == "currency" and "coin" in name:
        s += 8
    if slot == "animal" and any(k in name for k in ("portrait", "close", "head")):
        s += 3
    if any(k in name for k in ("night", "dark", "silhouette")):
        s -= 4
    return s


def choose(iso, slot, query, label):
    pref = PREFERRED.get(iso, {}).get(slot)
    titles = []
    if pref:
        titles.append("File:" + pref)
    key = max(tokens(label) or tokens(query) or {"photo"}, key=len)
    titles.extend(search_titles(f"intitle:{key} {query}", 6))
    titles.extend(search_titles(query, 6))
    seen = set(); ordered = []
    for t in titles:
        if t not in seen:
            seen.add(t); ordered.append(t)
    infos = imageinfos(ordered[:12])
    best = None
    best_s = -1
    for t in ordered[:12]:
        sc = score(t, infos.get(t), slot, query, label)
        if sc > best_s:
            best_s = sc
            best = (t, infos.get(t), sc)
    return best


def square_crop(im):
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        rgba = im.convert("RGBA")
        bg = Image.new("RGB", rgba.size, (255, 255, 255))
        bg.paste(rgba, mask=rgba.getchannel("A"))
        im = bg
    else:
        im = im.convert("RGB")
    w, h = im.size
    side = min(w, h)
    # Bias slightly upward so faces/buildings aren't cropped at the chin/top.
    cx, cy = w / 2, h * 0.46
    left = int(round(cx - side / 2))
    top = int(round(cy - side / 2))
    left = max(0, min(left, w - side))
    top = max(0, min(top, h - side))
    im = im.crop((left, top, left + side, top + side))
    im = im.resize((OUT, OUT), Image.Resampling.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=2))
    return im


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def where_phrase(bounds, lon, lat):
    minx, miny, maxx, maxy = bounds
    fx = (lon - minx) / (maxx - minx) if maxx > minx else 0.5
    fy = (lat - miny) / (maxy - miny) if maxy > miny else 0.5
    ns = "north" if fy > 0.62 else "south" if fy < 0.38 else ""
    ew = "east" if fx > 0.66 else "west" if fx < 0.34 else ""
    word = (ns + ew) if ns and ew else (ns or ew or "centre")
    en = {
        "north": "in the north", "south": "in the south", "east": "in the east", "west": "in the west",
        "northeast": "in the northeast", "northwest": "in the northwest",
        "southeast": "in the southeast", "southwest": "in the southwest",
        "centre": "near the centre",
    }[word]
    zh = {
        "north": "北部", "south": "南部", "east": "东部", "west": "西部",
        "northeast": "东北部", "northwest": "西北部",
        "southeast": "东南部", "southwest": "西南部",
        "centre": "中部",
    }[word]
    return en, zh


def bounds_of(feature):
    minx=miny=1e9; maxx=maxy=-1e9
    def walk(c):
        nonlocal minx,miny,maxx,maxy
        if c and isinstance(c[0], (int, float)):
            minx=min(minx,c[0]); maxx=max(maxx,c[0]); miny=min(miny,c[1]); maxy=max(maxy,c[1])
        else:
            for x in c: walk(x)
    walk(feature["geometry"]["coordinates"])
    return (minx, miny, maxx, maxy)


def fetch_flag(iso, title, credits):
    dest = os.path.join(ROOT, "assets", "flags", iso.lower() + ".svg")
    rel = f"assets/flags/{iso.lower()}.svg"
    if os.path.exists(dest) and os.path.getsize(dest) > 200:
        if not any(c.get("path") == rel for c in credits):
            infos = imageinfos(["File:" + title])
            info = infos.get("File:" + title)
            if info:
                credits.append(credit_row(rel, "File:" + title, info, "flag"))
        print("  flag cached", iso)
        return
    infos = imageinfos(["File:" + title])
    info = infos.get("File:" + title)
    if not info:
        # try alternate
        alts = search_titles("Flag of " + title.replace("Flag of ", "").replace(".svg",""), 4)
        infos = imageinfos(alts)
        for t, ii in infos.items():
            if t.lower().endswith(".svg") and license_ok(ii):
                info = ii; title = t.replace("File:", ""); break
    if not info:
        print("  FLAG MISS", iso, title)
        return
    if not license_ok(info):
        print("  FLAG LICENSE", iso, title, meta_text(info, "LicenseShortName"))
        return
    url = info.get("url")
    data = download(url)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    credits.append(credit_row(f"assets/flags/{iso.lower()}.svg", "File:" + title if not title.startswith("File:") else title, info, "flag"))
    print("  flag", iso, title)


def credit_row(path, title, info, kind):
    artist = meta_text(info, "Artist")
    # strip tags roughly
    import re
    artist = re.sub("<[^>]+>", "", artist)
    artist = re.sub(r"\s+", " ", artist).strip()[:240]
    return {
        "path": path,
        "kind": kind,
        "title": title.replace("File:", ""),
        "artist": artist or "Wikimedia Commons contributor",
        "license": meta_text(info, "LicenseShortName") or meta_text(info, "UsageTerms"),
        "source": info.get("descriptionurl") or ("https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))),
    }


def load_credits():
    path = os.path.join(ROOT, "data", "credits.json")
    if not os.path.exists(path):
        return []
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return []


def main():
    shapes = json.load(open(os.path.join(ROOT, "data", "shapes.json"), encoding="utf-8"))
    by_iso = {f["properties"]["iso"]: f for f in shapes["features"]}
    credits = load_credits()
    known = {c["path"] for c in credits}
    cards = {}
    weak = []
    for iso, row in SEED.items():
        cap_en, cap_zh, lon, lat, a_en, a_zh, a_q, c_en, c_zh, c_q, l_en, l_zh, l_q, d_en, d_zh, d_q = row
        feat = by_iso[iso]
        name, zh = feat["properties"]["name"], feat["properties"]["zh"]
        wh_en, wh_zh = WHERE_OVERRIDE.get(iso) or where_phrase(bounds_of(feat), lon, lat)
        folder = os.path.join(ROOT, "assets", "cards", iso.lower())
        os.makedirs(folder, exist_ok=True)
        images = {}
        for slot, query, label in (
            ("animal", a_q, a_en),
            ("currency", c_q, c_en),
            ("landmark", l_q, l_en),
            ("dish", d_q, d_en),
        ):
            dest = os.path.join(folder, slot + ".jpg")
            rel = f"assets/cards/{iso.lower()}/{slot}.jpg"
            if os.path.exists(dest) and os.path.getsize(dest) > 8000:
                images[slot] = rel
                print(f"  {iso} {slot} cached")
                continue
            try:
                picked = choose(iso, slot, query, label)
            except Exception as e:
                print("  ERR", iso, slot, e)
                picked = None
            if not picked or picked[2] < 0 or not picked[1]:
                print("  MISS", iso, slot, query)
                weak.append(f"{iso} {slot}: no acceptable photo for “{label}”")
                continue
            title, info, sc = picked
            url = info.get("thumburl") or info.get("url")
            try:
                raw = download(url)
                im = Image.open(BytesIO(raw))
                im = square_crop(im)
                # Skip muddy, nearly black frames. Try nothing else here;
                # a dark crop usually means a night shot or a bad subject.
                import statistics
                sample = list(im.resize((24, 24)).convert("L").getdata())
                mean = statistics.fmean(sample)
                if mean < 32 or mean > 248:
                    print(f"  DARK/FLAT {iso} {slot} mean={mean:.0f} {title.replace('File:','')[:60]}")
                    weak.append(f"{iso} {slot}: too dark or blank ({label})")
                    continue
                im.save(dest, "JPEG", quality=86, optimize=True, progressive=True)
            except Exception as e:
                print("  SAVE", iso, slot, e)
                weak.append(f"{iso} {slot}: download failed ({label})")
                continue
            images[slot] = rel
            if rel not in known:
                credits.append(credit_row(rel, title, info, slot))
                known.add(rel)
            print(f"  {iso} {slot} [{sc}] {title.replace('File:','')[:80]}")
        cards[iso] = {
            "capital": {"en": cap_en, "zh": cap_zh, "lon": lon, "lat": lat},
            "where": {"en": wh_en, "zh": wh_zh},
            "blurb": {
                "en": f"The capital is {cap_en}. It is {wh_en} of {name}.",
                "zh": f"首都是{cap_zh}，位于{zh}{wh_zh}。",
            },
            "animal": {"en": a_en, "zh": a_zh},
            "currency": {"en": c_en, "zh": c_zh},
            "landmark": {"en": l_en, "zh": l_zh},
            "dish": {"en": d_en, "zh": d_zh},
            "images": images,
        }
        try:
            before = len(credits)
            fetch_flag(iso, FLAGS[iso], credits)
            for c in credits[before:]:
                known.add(c["path"])
        except Exception as e:
            print("  FLAG ERR", iso, e)
            weak.append(f"{iso} flag: {e}")
        with open(os.path.join(ROOT, "data", "credits.json"), "w", encoding="utf-8") as f:
            json.dump(credits, f, ensure_ascii=False)

    with open(os.path.join(ROOT, "data", "cards.json"), "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    write_attributions(credits)
    with open(os.path.join(ROOT, "data", "image-notes.json"), "w", encoding="utf-8") as f:
        json.dump(weak, f, ensure_ascii=False, indent=2)
    print("cards", len(cards), "credits", len(credits), "notes", len(weak))
    make_sheets()


def write_attributions(credits):
    lines = [
        "# Attributions",
        "",
        "Classroom puzzle about land neighbours in Asia. Facts are geography, culture, food, and animals only.",
        "",
        "## Map data",
        "",
        "- Country outlines: [Natural Earth](https://www.naturalearthdata.com/) 1:10 million Admin 0 countries (public domain). Simplified for the web. Taiwan, Hong Kong, and Macao are drawn as part of China. Cyprus is drawn as one island.",
        "- Terrain: Natural Earth 1:50 million *Cross-blended Hypsometric Tints with Shaded Relief and Water* (`HYP_50M_SR_W`), public domain. Stored as `assets/relief.jpg`.",
        "- Rivers: Natural Earth 1:10 million river centerlines (public domain), clipped to countries they actually cross.",
        "- Projection: Lambert azimuthal equal-area. The China puzzle is centred at 40°N, 100°E, matching the previous game. Other centres use the same kind of projection recentred on that country so neighbours are not stretched.",
        "- Globe maths: [d3-geo](https://github.com/d3/d3-geo) (ISC), vendored in `js/vendor`. Triangulation: [earcut](https://github.com/mapbox/earcut) (ISC).",
        "",
        "## Flags and photos",
        "",
        "Flags are national flags from Wikimedia Commons (public domain or CC BY / CC BY-SA). Card photos are cropped to a 640×640 square. Replace any file under `assets/cards/<iso>/` (`animal.jpg`, `currency.jpg`, `landmark.jpg`, `dish.jpg`) to swap in a watercolor later.",
        "",
        "| File | Subject | Creator | License | Source |",
        "| --- | --- | --- | --- | --- |",
    ]
    for c in credits:
        artist = c["artist"].replace("|", "/")
        lines.append(f"| `{c['path']}` | {c['kind']}: {c['title']} | {artist} | {c['license']} | {c['source']} |")
    lines.append("")
    path = os.path.join(ROOT, "ATTRIBUTIONS.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("wrote", path)


def make_sheets():
    slots = ["animal", "currency", "landmark", "dish"]
    thumb = 150
    isos = sorted(os.listdir(os.path.join(ROOT, "assets", "cards")))
    cols = 9
    for slot in slots:
        rows = (len(isos) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * thumb, rows * (thumb + 28)), (244, 236, 220))
        draw = ImageDraw.Draw(sheet)
        for i, iso in enumerate(isos):
            p = os.path.join(ROOT, "assets", "cards", iso, slot + ".jpg")
            r, c = divmod(i, cols)
            x, y = c * thumb, r * (thumb + 28)
            if os.path.exists(p):
                im = Image.open(p).convert("RGB").resize((thumb - 8, thumb - 8))
                sheet.paste(im, (x + 4, y + 4))
            draw.text((x + 6, y + thumb - 2), iso.upper(), fill=(30, 30, 30))
        out = os.path.join(ROOT, "data", f"sheet-{slot}.jpg")
        sheet.save(out, quality=80)
        print("sheet", out)


if __name__ == "__main__":
    main()
