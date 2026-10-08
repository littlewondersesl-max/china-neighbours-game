# Attributions

Classroom puzzle about land neighbours in Asia. Facts are geography, culture, food, and animals only.

## Map data

- Country outlines: [Natural Earth](https://www.naturalearthdata.com/) 1:10 million Admin 0 countries (public domain). Simplified for the web. Taiwan, Hong Kong, and Macao are drawn as part of China. Cyprus is drawn as one island.
- Terrain: Natural Earth 1:50 million *Cross-blended Hypsometric Tints with Shaded Relief and Water* (`HYP_50M_SR_W`), public domain. Stored as `assets/relief.jpg`.
- Rivers: Natural Earth 1:10 million river centerlines (public domain), clipped to countries they actually cross.
- Projection: Lambert azimuthal equal-area. The China puzzle is centred at 40°N, 100°E, matching the previous game. Other centres use the same kind of projection recentred on that country so neighbours are not stretched.
- Globe maths: [d3-geo](https://github.com/d3/d3-geo) (ISC), vendored in `js/vendor`. Triangulation: [earcut](https://github.com/mapbox/earcut) (ISC).

## Flags and photos

Flags are national flags from Wikimedia Commons (public domain or CC BY / CC BY-SA). Card photos are cropped to a 640×640 square. Replace any file under `assets/cards/<iso>/` (`animal.jpg`, `currency.jpg`, `landmark.jpg`, `dish.jpg`) to swap in a watercolor later.

| File | Subject | Creator | License | Source |
| --- | --- | --- | --- | --- |
| `assets/cards/afg/currency.jpg` | currency: 1 Afghan afghani (1961).jpg | AKS.9955 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:1_Afghan_afghani_(1961).jpg |
| `assets/cards/afg/landmark.jpg` | landmark: Lake Band-e-Amir.jpg | Carl Montgomery | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Lake_Band-e-Amir.jpg |
| `assets/flags/afg.svg` | flag: Flag of Afghanistan.svg | Original: Taliban Vector: Lexicon | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_the_Taliban.svg |
| `assets/cards/are/currency.jpg` | currency: UAE 1 dirham coin, reverse.jpg | BearlyHoldingOn | CC0 | https://commons.wikimedia.org/wiki/File:UAE_1_dirham_coin,_reverse.jpg |
| `assets/flags/are.svg` | flag: Flag of the United Arab Emirates.svg | Abdulla Mohammed Al Maainah | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_the_United_Arab_Emirates.svg |
| `assets/cards/arm/animal.jpg` | animal: Portrait of a golden eagle.jpg | Joselodos | CC0 | https://commons.wikimedia.org/wiki/File:Portrait_of_a_golden_eagle.jpg |
| `assets/cards/arm/currency.jpg` | currency: 500 Armenian dram - 2017 (reverse).png | Central Bank of Armenia | Public domain | https://commons.wikimedia.org/wiki/File:500_Armenian_dram_-_2017_(reverse).png |
| `assets/cards/arm/landmark.jpg` | landmark: Monasterio de Geghard, Armenia, 2016-10-02, DD 65-74 PAN.jpg | Diego Delso | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Monasterio_de_Geghard,_Armenia,_2016-10-02,_DD_65-74_PAN.jpg |
| `assets/cards/arm/dish.jpg` | dish: Yerevan, Armenia Dolma plate July 2026.jpg | Sharon Hahn Darlin | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Yerevan,_Armenia_Dolma_plate_July_2026.jpg |
| `assets/flags/arm.svg` | flag: Flag of Armenia.svg | Original: Stepan Malkhasyants Vector: SKopp | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Armenia.svg |
| `assets/cards/aze/landmark.jpg` | landmark: Baku Maiden Tower.jpg | Derek Jones, uploaded by Jacobolus 09:16, 17 Jan 2005 (UTC) | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Baku_Maiden_Tower.jpg |
| `assets/cards/aze/dish.jpg` | dish: Azerbaijani plov.JPG | Urek Meniashvili | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Azerbaijani_plov.JPG |
| `assets/flags/aze.svg` | flag: Flag of Azerbaijan.svg | SKopp and others | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Azerbaijan.svg |
| `assets/cards/bgd/animal.jpg` | animal: Bengal Tiger Portrait.jpg | Shootsalot | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bengal_Tiger_Portrait.jpg |
| `assets/cards/bgd/landmark.jpg` | landmark: Tourist Boat in Sundarbans, West Bengal, India 03.jpg | Kingshuk Mondal | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Tourist_Boat_in_Sundarbans,_West_Bengal,_India_03.jpg |
| `assets/cards/bgd/dish.jpg` | dish: Hilsa curry with aubergine and pumpkin.jpg | Sarkar Sayantan | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Hilsa_curry_with_aubergine_and_pumpkin.jpg |
| `assets/cards/bgr/animal.jpg` | animal: 025 Wild European bee-eater in flight at Pfyn-Finges Photo by Giles Laurent.jpg | Giles Laurent | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:025_Wild_European_bee-eater_in_flight_at_Pfyn-Finges_Photo_by_Giles_Laurent.jpg |
| `assets/cards/bgr/dish.jpg` | dish: Traditional homemade Bulgarian pastry banitsa.jpg | Savannah Rivka Powell | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Traditional_homemade_Bulgarian_pastry_banitsa.jpg |
| `assets/flags/bgr.svg` | flag: Flag of Bulgaria.svg | SKopp | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Bulgaria.svg |
| `assets/cards/blr/landmark.jpg` | landmark: Belarus Mir Mir Castle Complex 8094 2075.jpg | Alexxx1979 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Belarus_Mir_Mir_Castle_Complex_8094_2075.jpg |
| `assets/flags/blr.svg` | flag: Flag of Belarus.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Belarus.svg |
| `assets/cards/brn/animal.jpg` | animal: Portrait of a Proboscis Monkey.jpg | Bjørn Christian Tørrissen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Portrait_of_a_Proboscis_Monkey.jpg |
| `assets/cards/brn/landmark.jpg` | landmark: Sultan Omar Ali Saifuddien Mosque; 2002.jpg | Daniel Weiss | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Sultan_Omar_Ali_Saifuddien_Mosque;_2002.jpg |
| `assets/flags/brn.svg` | flag: Flag of Brunei.svg | Nightstallion | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Brunei.svg |
| `assets/cards/btn/currency.jpg` | currency: 500 Ngultrum commemorative coin, Bhutan (Coronation of 5h King Jigme Khesar Namgyel).png | Jaman Md | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:500_Ngultrum_commemorative_coin,_Bhutan_(Coronation_of_5h_King_Jigme_Khesar_Namgyel).png |
| `assets/cards/btn/landmark.jpg` | landmark: The Tiger's Nest 1.jpg | Drajay1976 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:The_Tiger%27s_Nest_1.jpg |
| `assets/flags/btn.svg` | flag: Flag of Bhutan.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Bhutan.svg |
| `assets/cards/chn/animal.jpg` | animal: Giant Panda 2004-03-2.jpg | Jeff Kubina | Public domain | https://commons.wikimedia.org/wiki/File:Giant_Panda_2004-03-2.jpg |
| `assets/cards/chn/landmark.jpg` | landmark: The Great Wall of China at Jinshanling-edit.jpg | Severin.stalder | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:The_Great_Wall_of_China_at_Jinshanling-edit.jpg |
| `assets/cards/chn/dish.jpg` | dish: Chinese dumplings (Jiaozi) (2196005904).jpg | David Pursehouse from Kawasaki, Japan | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Chinese_dumplings_(Jiaozi)_(2196005904).jpg |
| `assets/flags/chn.svg` | flag: Flag of the People's Republic of China.svg | Zeng Liansong | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_the_People%27s_Republic_of_China.svg |
| `assets/cards/egy/landmark.jpg` | landmark: All Gizah Pyramids.jpg | Ricardo Liberato | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:All_Gizah_Pyramids.jpg |
| `assets/flags/egy.svg` | flag: Flag of Egypt.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Egypt.svg |
| `assets/cards/est/landmark.jpg` | landmark: Tallinn aerial 2022.jpg | kallerna | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Tallinn_aerial_2022.jpg |
| `assets/cards/fin/currency.jpg` | currency: Finnish 5 euro cent coin from 2002.jpg | Ximonic (Simo Räsänen) | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Finnish_5_euro_cent_coin_from_2002.jpg |
| `assets/cards/fin/landmark.jpg` | landmark: Suomenlinna.jpg | Michal Pise, Michal.Pise | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Suomenlinna.jpg |
| `assets/cards/fin/dish.jpg` | dish: Munavoi (egg butter) and Karelian pasties.jpg | kahvikisu from Kangasala, Suomi (Finland) | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Munavoi_(egg_butter)_and_Karelian_pasties.jpg |
| `assets/flags/fin.svg` | flag: Flag of Finland.svg | Unknown | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Finland.svg |
| `assets/cards/geo/currency.jpg` | currency: 20th Jubilee Of Lari Georgia coin 20 Lari Obvers.png | National bank of Georgia | Public domain | https://commons.wikimedia.org/wiki/File:20th_Jubilee_Of_Lari_Georgia_coin_20_Lari_Obvers.png |
| `assets/cards/geo/landmark.jpg` | landmark: Kazbek, Gergeti Trinity Church 2017.jpg | MaxBenidze | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Kazbek,_Gergeti_Trinity_Church_2017.jpg |
| `assets/cards/geo/dish.jpg` | dish: Khachapuri Adjaruli with egg and butter 2016.jpg | Eugene Krasnaok | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Khachapuri_Adjaruli_with_egg_and_butter_2016.jpg |
| `assets/flags/geo.svg` | flag: Flag of Georgia.svg | Last update by MapGrid SKopp | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Georgia.svg |
| `assets/cards/grc/animal.jpg` | animal: NMMP dolphin with locator.jpeg | U.S. Navy photo by Photographer's Mate 1st Class Brien Aho. | Public domain | https://commons.wikimedia.org/wiki/File:NMMP_dolphin_with_locator.jpeg |
| `assets/cards/grc/currency.jpg` | currency: 2020 Greek Commemorative 2 Euro Coin "2500th Anniversary of the Battle of Thermopylae" M.Hoffmann.png | Unknown authorUnknown author | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:2020_Greek_Commemorative_2_Euro_Coin_%222500th_Anniversary_of_the_Battle_of_Thermopylae%22_M.Hoffmann.png |
| `assets/cards/grc/landmark.jpg` | landmark: Parthenon daylight.jpg | Evangeloskaralis | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Parthenon_daylight.jpg |
| `assets/cards/grc/dish.jpg` | dish: Chicken souvlaki pita with french fries.jpg | Breawycker | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Chicken_souvlaki_pita_with_french_fries.jpg |
| `assets/flags/grc.svg` | flag: Flag of Greece.svg | Unknown authorUnknown author | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Greece.svg |
| `assets/cards/idn/animal.jpg` | animal: Artis Portrait - Komodo dragon (14030813283).jpg | Kitty Terwolbeck from The Netherlands | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Artis_Portrait_-_Komodo_dragon_(14030813283).jpg |
| `assets/cards/idn/currency.jpg` | currency: 1000 rupiah coin obverse.jpg | Coins by Bank of Indonesia, photographs by self | Public domain | https://commons.wikimedia.org/wiki/File:1000_rupiah_coin_obverse.jpg |
| `assets/cards/idn/dish.jpg` | dish: Nasi goreng, Warung Kuliner 69, BG Junction, 2025 (02).jpg | Bahnfrend | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Nasi_goreng,_Warung_Kuliner_69,_BG_Junction,_2025_(02).jpg |
| `assets/cards/ind/animal.jpg` | animal: Bengal tiger (Panthera tigris tigris) female.jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bengal_tiger_(Panthera_tigris_tigris)_female.jpg |
| `assets/cards/ind/landmark.jpg` | landmark: Taj Mahal (Edited).jpeg | Yann; edited by Jim Carter | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Taj_Mahal_(Edited).jpeg |
| `assets/cards/ind/dish.jpg` | dish: A home made plate of mutton biryani served with chicken kassa cooked in the bengali style.jpg | Subhrajyoti07 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:A_home_made_plate_of_mutton_biryani_served_with_chicken_kassa_cooked_in_the_bengali_style.jpg |
| `assets/flags/ind.svg` | flag: Flag of India.svg | Government of India | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_India.svg |
| `assets/cards/irn/landmark.jpg` | landmark: Persepolis, Iran 13.jpg | Bernard Gagnon | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Persepolis,_Iran_13.jpg |
| `assets/cards/irn/dish.jpg` | dish: Chelo Kebab, Signature's by Sugar and Spice, Kolkata.jpg | Rakhshanda Mujib | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Chelo_Kebab,_Signature%27s_by_Sugar_and_Spice,_Kolkata.jpg |
| `assets/flags/irn.svg` | flag: Flag of Iran.svg | SVG file: SiBr4Designer: Hamid NadimiConstruction: ISIRI | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Iran.svg |
| `assets/cards/irq/animal.jpg` | animal: Chukar Partridge Leh.jpg | Karunakar Rayker from India | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Chukar_Partridge_Leh.jpg |
| `assets/cards/irq/landmark.jpg` | landmark: Ancient ziggurat at Ali Air Base Iraq 2005.jpg | en:User:Hardnfast | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Ancient_ziggurat_at_Ali_Air_Base_Iraq_2005.jpg |
| `assets/cards/irq/dish.jpg` | dish: Dolma food.jpg | Ahmedabad12 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dolma_food.jpg |
| `assets/flags/irq.svg` | flag: Flag of Iraq.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Iraq.svg |
| `assets/cards/isr/currency.jpg` | currency: 1 new shekel.jpg | Kalashnov | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:1_new_shekel.jpg |
| `assets/flags/isr.svg` | flag: Flag of Israel.svg | Israel Belkind and Fanny Abramovitch (original) “The Provisional Council of State Proclamation of the Flag of the State of Israel” of 25 Tishrei 5709 (28 October 1948) provides the official specification for the design of the Israeli flag.  | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Israel.svg |
| `assets/cards/jor/landmark.jpg` | landmark: Al Khazneh Petra edit 2.jpg | Al_Khazneh_Petra.jpg: Graham Racher from London, UK derivative work: MrPanyGoff | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Al_Khazneh_Petra_edit_2.jpg |
| `assets/cards/jor/dish.jpg` | dish: Mansaf, the traditional dish of Jordan.jpg | Jktab | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Mansaf,_the_traditional_dish_of_Jordan.jpg |
| `assets/flags/jor.svg` | flag: Flag of Jordan.svg | Unknown | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Jordan.svg |
| `assets/cards/kaz/landmark.jpg` | landmark: Charyn Canyon, Kazakhstan 03.jpg | Bgag | CC0 | https://commons.wikimedia.org/wiki/File:Charyn_Canyon,_Kazakhstan_03.jpg |
| `assets/cards/kaz/dish.jpg` | dish: Beshbarmak, national dish (3991850909).jpg | Peretz Partensky from San Francisco, USA | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Beshbarmak,_national_dish_(3991850909).jpg |
| `assets/flags/kaz.svg` | flag: Flag of Kazakhstan.svg | Shaken Niyazbekop | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Kazakhstan.svg |
| `assets/cards/kgz/animal.jpg` | animal: Snow leopard portrait-2010-07-09.jpg | Original: Tambako The Jaguar Derivative work: User:Niabot | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Snow_leopard_portrait-2010-07-09.jpg |
| `assets/cards/kgz/landmark.jpg` | landmark: Lake Issyk-Kul, Kyrgyzstan.jpg | Bgag | CC0 | https://commons.wikimedia.org/wiki/File:Lake_Issyk-Kul,_Kyrgyzstan.jpg |
| `assets/flags/kgz.svg` | flag: Flag of Kyrgyzstan.svg | Shakiev N.T., Primov U.B. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Kyrgyzstan.svg |
| `assets/cards/khm/animal.jpg` | animal: Giant Ibis ( Pseudibis gigantea) 01.jpg | Katharine Khamhaengwong | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Giant_Ibis_(_Pseudibis_gigantea)_01.jpg |
| `assets/cards/khm/currency.jpg` | currency: Cambodian 500 riel reverse.jpg | Dmitry Makeev | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Cambodian_500_riel_reverse.jpg |
| `assets/cards/khm/landmark.jpg` | landmark: Angkor Wat.jpg | Bjørn Christian Tørrissen | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Angkor_Wat.jpg |
| `assets/cards/khm/dish.jpg` | dish: Tasty fish amok in a coconut (15941045359).jpg | yashima from Karlsruhe, Germany | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Tasty_fish_amok_in_a_coconut_(15941045359).jpg |
| `assets/flags/khm.svg` | flag: Flag of Cambodia.svg | Unknown authorUnknown author | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Cambodia.svg |
| `assets/cards/kor/animal.jpg` | animal: Dierenpark Emmen Portrait of a siberian tiger (9187111340).jpg | Alias 0591 from the Netherlands | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Dierenpark_Emmen_Portrait_of_a_siberian_tiger_(9187111340).jpg |
| `assets/cards/kor/dish.jpg` | dish: Bibimbap with egg.jpg | Cjkennedy15 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bibimbap_with_egg.jpg |
| `assets/flags/kor.svg` | flag: Flag of South Korea.svg | Original: Government of the Republic of Korea Vector: Great Brightstar and others | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_South_Korea.svg |
| `assets/cards/kwt/animal.jpg` | animal: Arabian Camel in Kuwait.jpg | Manojkiri photography | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Arabian_Camel_in_Kuwait.jpg |
| `assets/flags/kwt.svg` | flag: Flag of Kuwait.svg | Wikimedia Commons contributor | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Kuwait.svg |
| `assets/cards/lao/landmark.jpg` | landmark: Kuang Si Falls and a turquoise water pool in Luang Prabang province Laos.jpg | Basile Morin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Kuang_Si_Falls_and_a_turquoise_water_pool_in_Luang_Prabang_province_Laos.jpg |
| `assets/cards/lao/dish.jpg` | dish: Sticky rice basket, Lao - Vietnam Museum of Ethnology - Hanoi, Vietnam - DSC02895.JPG | Daderot | CC0 | https://commons.wikimedia.org/wiki/File:Sticky_rice_basket,_Lao_-_Vietnam_Museum_of_Ethnology_-_Hanoi,_Vietnam_-_DSC02895.JPG |
| `assets/flags/lao.svg` | flag: Flag of Laos.svg | SKopp | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Laos.svg |
| `assets/cards/lbn/landmark.jpg` | landmark: Pano Baalbek 1.jpg | Eusebius | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Pano_Baalbek_1.jpg |
| `assets/flags/lbn.svg` | flag: Flag of Lebanon.svg | Henri Pharaon | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Lebanon.svg |
| `assets/cards/ltu/animal.jpg` | animal: White Stork and Pond Heron.jpg | Anirudhanmuthuvara | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:White_Stork_and_Pond_Heron.jpg |
| `assets/cards/ltu/landmark.jpg` | landmark: Trakai Island Castle Chapel, Lithuania - Diliff.jpg | Diliff | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Trakai_Island_Castle_Chapel,_Lithuania_-_Diliff.jpg |
| `assets/cards/ltu/dish.jpg` | dish: Cepelinai 2, Vilnius, Lithuania - Diliff.jpg | Diliff | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Cepelinai_2,_Vilnius,_Lithuania_-_Diliff.jpg |
| `assets/flags/ltu.svg` | flag: Flag of Lithuania.svg | Original: Jonas Basanavičius, Tadas Daugirdas and Antanas Žmuidzinavičius Vector: SKopp The SVG code is valid. This flag was created with a text editor.Previous version had been created with Inkscape (1930 bytes) f now 14.15% of previous si | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Lithuania.svg |
| `assets/cards/lva/currency.jpg` | currency: Latvian 20 euro cent coin from 2014.jpg | Ximonic (Simo Räsänen) | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Latvian_20_euro_cent_coin_from_2014.jpg |
| `assets/cards/lva/landmark.jpg` | landmark: House of Blackheads and St. Peter's Church Tower, Riga, Latvia - Diliff.jpg | Diliff | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:House_of_Blackheads_and_St._Peter%27s_Church_Tower,_Riga,_Latvia_-_Diliff.jpg |
| `assets/cards/lva/dish.jpg` | dish: Latvian piragi (bacon buns).jpg | Sara McCleary | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Latvian_piragi_(bacon_buns).jpg |
| `assets/cards/mmr/dish.jpg` | dish: Myanmar’s Traditional Food - Mohinga.jpg | Soonduggyhuppy | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Myanmar%E2%80%99s_Traditional_Food_-_Mohinga.jpg |
| `assets/flags/mmr.svg` | flag: Flag of Myanmar.svg | Unknown authorUnknown author | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Myanmar.svg |
| `assets/cards/mng/landmark.jpg` | landmark: Khongoryn Els 05.jpg | Bernard Gagnon | CC0 | https://commons.wikimedia.org/wiki/File:Khongoryn_Els_05.jpg |
| `assets/cards/mng/dish.jpg` | dish: Bansh Buuz Khuushuur 2.JPG | Brücke-Osteuropa | Public domain | https://commons.wikimedia.org/wiki/File:Bansh_Buuz_Khuushuur_2.JPG |
| `assets/flags/mng.svg` | flag: Flag of Mongolia.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Mongolia.svg |
| `assets/cards/mys/dish.jpg` | dish: Nasi lemak 1.jpg | Clee7903 at English Wikipedia | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Nasi_lemak_1.jpg |
| `assets/flags/mys.svg` | flag: Flag of Malaysia.svg | MapGrid (old version SKopp, Zscout370 and Ranking Update) | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Malaysia.svg |
| `assets/flags/nor.svg` | flag: Flag of Norway.svg | Original: Fredrik Meltzer Vector: Gutten på Hemsen | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Norway.svg |
| `assets/cards/npl/currency.jpg` | currency: Nepali big one rupee coin.jpg | श्रेष्ठ भूपेन्द्र | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Nepali_big_one_rupee_coin.jpg |
| `assets/cards/npl/landmark.jpg` | landmark: Mount Everest as seen from Drukair2 PLW edit.jpg | Mount_Everest_as_seen_from_Drukair2.jpg: shrimpo1967 derivative work: Papa Lima Whiskey 2 (talk) | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Mount_Everest_as_seen_from_Drukair2_PLW_edit.jpg |
| `assets/flags/npl.svg` | flag: Flag of Nepal.svg | Drawn by Pumbaa80, Achim1999 | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Nepal.svg |
| `assets/cards/omn/animal.jpg` | animal: Arabian Oryx Sanctuary.jpg | https://www.flickr.com/photos/42996397@N05/ | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Arabian_Oryx_Sanctuary.jpg |
| `assets/cards/omn/landmark.jpg` | landmark: Sultan Qaboos Grand Mosque Muscat 06.JPG | Rrburke | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Sultan_Qaboos_Grand_Mosque_Muscat_06.JPG |
| `assets/cards/pak/currency.jpg` | currency: 5 pakistani rupee coin.jpg | Tyba198 | CC0 | https://commons.wikimedia.org/wiki/File:5_pakistani_rupee_coin.jpg |
| `assets/flags/pak.svg` | flag: Flag of Pakistan.svg | User:Zscout370 | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Pakistan.svg |
| `assets/cards/png/animal.jpg` | animal: Raggiana Bird-of-Paradise wild 5.jpg | markaharper1 | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Raggiana_Bird-of-Paradise_wild_5.jpg |
| `assets/cards/png/currency.jpg` | currency: 5 Kina of Papua New Guinea - Elizabeth II, bird-of-paradise 1975.png | Windrain | CC0 | https://commons.wikimedia.org/wiki/File:5_Kina_of_Papua_New_Guinea_-_Elizabeth_II,_bird-of-paradise_1975.png |
| `assets/cards/png/landmark.jpg` | landmark: Tavurvur volcano edit.jpg | Taro Taylor edit by Richard Bartz | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Tavurvur_volcano_edit.jpg |
| `assets/cards/png/dish.jpg` | dish: A Mumu in Papua New Guinea.jpg | Jay Evennett | CC0 | https://commons.wikimedia.org/wiki/File:A_Mumu_in_Papua_New_Guinea.jpg |
| `assets/flags/png.svg` | flag: Flag of Papua New Guinea.svg | User:Nightstallion | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Papua_New_Guinea.svg |
| `assets/cards/pol/animal.jpg` | animal: European bison (Bison bonasus) male Białowieza.jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:European_bison_(Bison_bonasus)_male_Bia%C5%82owieza.jpg |
| `assets/cards/pol/landmark.jpg` | landmark: Panorama of Malbork Castle, part 4.jpg | DerHexer; derivate work: Carschten | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Panorama_of_Malbork_Castle,_part_4.jpg |
| `assets/cards/pol/dish.jpg` | dish: Pierogi ruskie Słupsk.jpg | MOs810 | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Pierogi_ruskie_S%C5%82upsk.jpg |
| `assets/cards/prk/dish.jpg` | dish: Korean Naengmyeon(Cold Noodle).jpg | Shene81 | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Korean_Naengmyeon(Cold_Noodle).jpg |
| `assets/flags/prk.svg` | flag: Flag of North Korea.svg | Original: Unknown author Vector: Zscout370 | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_North_Korea.svg |
| `assets/cards/psx/animal.jpg` | animal: Palestine sunbird (Cinnyris osea osea) male.jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Palestine_sunbird_(Cinnyris_osea_osea)_male.jpg |
| `assets/cards/psx/currency.jpg` | currency: 1 new shekel.jpg | Kalashnov | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:1_new_shekel.jpg |
| `assets/cards/psx/landmark.jpg` | landmark: Red terracotta Ancient Bronze period 3500-2000 BC Tell es-Sultan, ancient Jericho, Tomb A IV, Louvre Museum AO 15611.jpg | ALFGRN | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Red_terracotta_Ancient_Bronze_period_3500-2000_BC_Tell_es-Sultan,_ancient_Jericho,_Tomb_A_IV,_Louvre_Museum_AO_15611.jpg |
| `assets/cards/psx/dish.jpg` | dish: Musakhan served in Jerusalem, Israel.jpg | Tom Bahar | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Musakhan_served_in_Jerusalem,_Israel.jpg |
| `assets/flags/psx.svg` | flag: Flag of Palestine.svg | Orionist, previous versions by Makaristos, Mysid, etc. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Palestine.svg |
| `assets/cards/qat/landmark.jpg` | landmark: View of the Persian Gulf and the Museum of Islamic Art in Qatar at dusk.jpg | Alex Sergeev (www.asergeev.com) | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:View_of_the_Persian_Gulf_and_the_Museum_of_Islamic_Art_in_Qatar_at_dusk.jpg |
| `assets/flags/qat.svg` | flag: Flag of Qatar.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Qatar.svg |
| `assets/cards/rus/animal.jpg` | animal: Brown Bear Braunbär (139985517).jpeg | Matthias | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Brown_Bear_Braunb%C3%A4r_(139985517).jpeg |
| `assets/cards/rus/landmark.jpg` | landmark: Lake Baikal in winter.jpg | Sergey Pesterev | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Lake_Baikal_in_winter.jpg |
| `assets/cards/rus/dish.jpg` | dish: Russian Pelmeni (Dumplings), Rostov-on-Don, Russia.jpg | Vyacheslav Argenberg | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Russian_Pelmeni_(Dumplings),_Rostov-on-Don,_Russia.jpg |
| `assets/cards/sau/animal.jpg` | animal: Dromedary Arabian camel (8454264337).jpg | shankar s. from Dubai, united arab emirates | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Dromedary_Arabian_camel_(8454264337).jpg |
| `assets/cards/sau/currency.jpg` | currency: Saudi Riyal coin.png | ARABCREATOR7 | CC0 | https://commons.wikimedia.org/wiki/File:Saudi_Riyal_coin.png |
| `assets/cards/sau/landmark.jpg` | landmark: 27, Hegra (Mada'in Salih), Saudi Arabia.jpg | Following Hadrian | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:27,_Hegra_(Mada%27in_Salih),_Saudi_Arabia.jpg |
| `assets/flags/sau.svg` | flag: Flag of Saudi Arabia.svg | The Shura Council | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Saudi_Arabia.svg |
| `assets/cards/syr/landmark.jpg` | landmark: Krak des Chevaliers landscape (cropped).jpg | Krak_des_Chevaliers_landscape.jpg: (Ergo) derivative work: Nev1 (talk) | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Krak_des_Chevaliers_landscape_(cropped).jpg |
| `assets/flags/syr.svg` | flag: Flag of Syria.svg | Modification by AnonMoos of PD image File:Flag of Syria (1930–1958, 1961–1963).svg (previous non-vector versions were by Coup de crayon 2011) | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Syria_(2025-).svg |
| `assets/cards/tha/currency.jpg` | currency: 10 baht obverse.jpg | Isthisthing | CC0 | https://commons.wikimedia.org/wiki/File:10_baht_obverse.jpg |
| `assets/cards/tha/dish.jpg` | dish: DFC 2078 A plate of shrimp pad Thai garnished with lime bean sprouts scallions and crushed peanuts.jpg | PattayaPatrol | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:DFC_2078_A_plate_of_shrimp_pad_Thai_garnished_with_lime_bean_sprouts_scallions_and_crushed_peanuts.jpg |
| `assets/flags/tha.svg` | flag: Flag of Thailand.svg | Zscout370 | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Thailand.svg |
| `assets/cards/tjk/currency.jpg` | currency: TJ 5 somoni 2018 ob.jpg | National Bank of Tajikistan | Public domain | https://commons.wikimedia.org/wiki/File:TJ_5_somoni_2018_ob.jpg |
| `assets/cards/tjk/landmark.jpg` | landmark: Iskanderkul and Fann Mountains.jpg | Adam Harangozó | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Iskanderkul_and_Fann_Mountains.jpg |
| `assets/cards/tjk/dish.jpg` | dish: Tajik plov.jpg | Brian Harrington Spier | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Tajik_plov.jpg |
| `assets/flags/tjk.svg` | flag: Flag of Tajikistan.svg | Unknown authorUnknown author | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Tajikistan.svg |
| `assets/cards/tkm/animal.jpg` | animal: Akhal-Teke Horse (Obama).jpg | David Stanley | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Akhal-Teke_Horse_(Obama).jpg |
| `assets/cards/tkm/currency.jpg` | currency: 1 Manat (2010) - Rückseite.jpg | Cerdded41 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:1_Manat_(2010)_-_R%C3%BCckseite.jpg |
| `assets/cards/tkm/landmark.jpg` | landmark: Darvaza gas crater, Jähennem derwezesi, Door to Hell, Gates of Hell, Derweze, Turkmenistan.jpg | Benjamin Goetzinger | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Darvaza_gas_crater,_J%C3%A4hennem_derwezesi,_Door_to_Hell,_Gates_of_Hell,_Derweze,_Turkmenistan.jpg |
| `assets/cards/tkm/dish.jpg` | dish: Central Asian Plov Centre in Tashkent.jpg | Adam Harangozó | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Central_Asian_Plov_Centre_in_Tashkent.jpg |
| `assets/flags/tkm.svg` | flag: Flag of Turkmenistan.svg | Wikimedia Commons contributor | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Turkmenistan.svg |
| `assets/cards/tls/landmark.jpg` | landmark: Cristo Rei beach, Dili, 2018 (04).jpg | Bahnfrend | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Cristo_Rei_beach,_Dili,_2018_(04).jpg |
| `assets/flags/tls.svg` | flag: Flag of East Timor.svg | See File history, below, for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_East_Timor.svg |
| `assets/cards/tur/animal.jpg` | animal: White Odd-eyed Turkish Angora Cat.jpg | Ankarakediler | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:White_Odd-eyed_Turkish_Angora_Cat.jpg |
| `assets/cards/tur/currency.jpg` | currency: 10 Lira (Turkey).jpg | AKS.9955 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:10_Lira_(Turkey).jpg |
| `assets/cards/tur/landmark.jpg` | landmark: Fairy chimneys in Cappadocia - panoramio.jpg | belemita@gmail.com | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Fairy_chimneys_in_Cappadocia_-_panoramio.jpg |
| `assets/cards/tur/dish.jpg` | dish: Bico (cagh kebab).jpg | E4024 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bico_(cagh_kebab).jpg |
| `assets/flags/tur.svg` | flag: Flag of Turkey.svg | David Benbennick (original author) | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Turkey.svg |
| `assets/cards/ukr/animal.jpg` | animal: Stork Portrait (120778763).jpeg | Matthias | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:Stork_Portrait_(120778763).jpeg |
| `assets/cards/ukr/currency.jpg` | currency: 1 hryvnia coin of Ukraine, 2018 (averse).jpg | National Bank of Ukraine | Public domain | https://commons.wikimedia.org/wiki/File:1_hryvnia_coin_of_Ukraine,_2018_(averse).jpg |
| `assets/cards/ukr/landmark.jpg` | landmark: 68-104-9007 Kamianets-Podilskyi Fortress RB 18 2.jpg | Rbrechko | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:68-104-9007_Kamianets-Podilskyi_Fortress_RB_18_2.jpg |
| `assets/cards/ukr/dish.jpg` | dish: A bowl of borscht at the Church of St John the Baptist Ukrainian Catholic Church. Mmm....good, esp with a spoonful of sour cream. (33943671165).jpg | Ross Dunn | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:A_bowl_of_borscht_at_the_Church_of_St_John_the_Baptist_Ukrainian_Catholic_Church._Mmm....good,_esp_with_a_spoonful_of_sour_cream._(33943671165).jpg |
| `assets/cards/uzb/dish.jpg` | dish: Plov Tashkent.jpg | Ekrem Canli | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Plov_Tashkent.jpg |
| `assets/flags/uzb.svg` | flag: Flag of Uzbekistan.svg | Farhod Yoʻldoshev | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Uzbekistan.svg |
| `assets/cards/vnm/dish.jpg` | dish: Large bowl of Beef Pho from Dalat Vietnamese Restaurtant.jpg | Peachyeung316 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Large_bowl_of_Beef_Pho_from_Dalat_Vietnamese_Restaurtant.jpg |
| `assets/flags/vnm.svg` | flag: Flag of Vietnam.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Vietnam.svg |
| `assets/cards/yem/landmark.jpg` | landmark: Dragonblood tree in Socotra 2.jpg | Alex38 | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Dragonblood_tree_in_Socotra_2.jpg |
| `assets/cards/afg/animal.jpg` | animal: Snow leopard portrait-2010-07-09.jpg | Original: Tambako The Jaguar Derivative work: User:Niabot | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Snow_leopard_portrait-2010-07-09.jpg |
| `assets/cards/afg/dish.jpg` | dish: Kabuli Pulao.JPG | Miansari66 | CC0 | https://commons.wikimedia.org/wiki/File:Kabuli_Pulao.JPG |
| `assets/cards/are/animal.jpg` | animal: Arabian oryx (oryx leucoryx).jpg | Charles J. Sharp | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Arabian_oryx_(oryx_leucoryx).jpg |
| `assets/cards/are/landmark.jpg` | landmark: Burj Khalifa (16260269606).jpg | Laika ac | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Burj_Khalifa_(16260269606).jpg |
| `assets/cards/aze/animal.jpg` | animal: Karabakh horse head 4.jpg | President.az | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Karabakh_horse_head_4.jpg |
| `assets/cards/blr/animal.jpg` | animal: European bison (Bison bonasus) male Białowieza.jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:European_bison_(Bison_bonasus)_male_Bia%C5%82owieza.jpg |
| `assets/cards/blr/dish.jpg` | dish: Belorussian national potato meal "draniki" and a cup of drink..JPG | Александр Корчик | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Belorussian_national_potato_meal_%22draniki%22_and_a_cup_of_drink..JPG |
| `assets/cards/brn/dish.jpg` | dish: Ambuyat in Bandar Seri Begawan Brunei.jpg | e_chaya | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Ambuyat_in_Bandar_Seri_Begawan_Brunei.jpg |
| `assets/cards/btn/animal.jpg` | animal: Budorcas taxicolor (takin) in Korkeasaari zoo.jpg | Stephan van Helden | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Budorcas_taxicolor_(takin)_in_Korkeasaari_zoo.jpg |
| `assets/cards/btn/dish.jpg` | dish: Buff Ema datshi with Thingmo.jpg | Satdeep Gill | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Buff_Ema_datshi_with_Thingmo.jpg |
| `assets/cards/egy/dish.jpg` | dish: Egyptian Koshari.jpg | Basma | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Egyptian_Koshari.jpg |
| `assets/cards/kaz/animal.jpg` | animal: 015 Wild Golden Eagle in flight at Pfyn-Finges (Switzerland) Photo by Giles Laurent.jpg | Giles Laurent | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:015_Wild_Golden_Eagle_in_flight_at_Pfyn-Finges_(Switzerland)_Photo_by_Giles_Laurent.jpg |
| `assets/cards/vnm/animal.jpg` | animal: Bubalus bubalis (water buffalo) calf, looking at the viewer, the feet in a pond, in Laos.jpg | Basile Morin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bubalus_bubalis_(water_buffalo)_calf,_looking_at_the_viewer,_the_feet_in_a_pond,_in_Laos.jpg |
| `assets/cards/est/dish.jpg` | dish: Dark rye bread.JPG | Glane23 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Dark_rye_bread.JPG |
| `assets/cards/fin/animal.jpg` | animal: Brown bear (Ursus arctos arctos) running.jpg | Malene Thyssen | CC BY 2.5 | https://commons.wikimedia.org/wiki/File:Brown_bear_(Ursus_arctos_arctos)_running.jpg |
| `assets/cards/geo/animal.jpg` | animal: East Caucasian Tur 02.JPG | Kor!An (Корзун Андрей) | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:East_Caucasian_Tur_02.JPG |
| `assets/cards/idn/landmark.jpg` | landmark: Borobudur, Java, Indonesia, 20220817 1013 8739.jpg | Jakub Hałun | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Borobudur,_Java,_Indonesia,_20220817_1013_8739.jpg |
| `assets/cards/irn/animal.jpg` | animal: Persian Leopard sitting.jpg | Tamar Assaf | Public domain | https://commons.wikimedia.org/wiki/File:Persian_Leopard_sitting.jpg |
| `assets/cards/isr/animal.jpg` | animal: Mountain gazelle (gazella gazella).jpg | Charles J. Sharp | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Mountain_gazelle_(gazella_gazella).jpg |
| `assets/cards/isr/landmark.jpg` | landmark: Dead Sea salt formation (Aerial view, 2007).jpg | Godot13 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dead_Sea_salt_formation_(Aerial_view,_2007).jpg |
| `assets/cards/isr/dish.jpg` | dish: Falafel 1.JPG | Miansari66 | CC0 | https://commons.wikimedia.org/wiki/File:Falafel_1.JPG |
| `assets/cards/jor/animal.jpg` | animal: Arabian oryx (oryx leucoryx).jpg | Charles J. Sharp | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Arabian_oryx_(oryx_leucoryx).jpg |
| `assets/cards/kgz/dish.jpg` | dish: Qalacha Laghman valley.jpg | Khyber_kakar003 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Qalacha_Laghman_valley.jpg |
| `assets/cards/kor/landmark.jpg` | landmark: Gyeonghoeru (Royal Banquet Hall) at Gyeongbokgung Palace, Seoul.jpg | Frank Schulenburg | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Gyeonghoeru_(Royal_Banquet_Hall)_at_Gyeongbokgung_Palace,_Seoul.jpg |
| `assets/cards/kwt/landmark.jpg` | landmark: Kuwait towers.jpg | Mikael Lindmark | CC BY-SA 2.5 se | https://commons.wikimedia.org/wiki/File:Kuwait_towers.jpg |
| `assets/cards/lbn/animal.jpg` | animal: Striped hyena (Hyaena hyaena).jpg | Rushikesh Deshmukh DOP | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Striped_hyena_(Hyaena_hyaena).jpg |
| `assets/cards/lbn/dish.jpg` | dish: Flickr - cyclonebill - Tabbouleh.jpg | cyclonebill | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Flickr_-_cyclonebill_-_Tabbouleh.jpg |
| `assets/cards/mmr/currency.jpg` | currency: Myanmar (Burma) 1 Kyat (Rupee) 1214 (=1852-53) Silver Coin, obverse.jpg | Berlin-George | Public domain | https://commons.wikimedia.org/wiki/File:Myanmar_(Burma)_1_Kyat_(Rupee)_1214_(%3D1852-53)_Silver_Coin,_obverse.jpg |
| `assets/cards/mmr/landmark.jpg` | landmark: Bagan, Myanmar, Htilominlo Temple and other Buddhist stupas in Bagan plain.jpg | Vyacheslav Argenberg | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Bagan,_Myanmar,_Htilominlo_Temple_and_other_Buddhist_stupas_in_Bagan_plain.jpg |
| `assets/cards/mng/animal.jpg` | animal: Przewalski's Horse (02710137).jpg | IAEA Imagebank | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Przewalski%27s_Horse_(02710137).jpg |
| `assets/cards/mys/animal.jpg` | animal: Panthera Tigris Jacksoni (Malayan Tiger).jpg | B_cool | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Panthera_Tigris_Jacksoni_(Malayan_Tiger).jpg |
| `assets/cards/mys/landmark.jpg` | landmark: 2016 Kuala Lumpur, Petronas Towers (21).jpg | Marcin Konsek | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:2016_Kuala_Lumpur,_Petronas_Towers_(21).jpg |
| `assets/cards/nor/animal.jpg` | animal: Moose in Grand Teton National Park 3 (8007698498).jpg | Tony Hisgett from Birmingham, UK | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Moose_in_Grand_Teton_National_Park_3_(8007698498).jpg |
| `assets/cards/nor/landmark.jpg` | landmark: Geirangerfjord LC0188.jpg | Jörg Hempel | CC BY-SA 2.0 de | https://commons.wikimedia.org/wiki/File:Geirangerfjord_LC0188.jpg |
| `assets/cards/npl/dish.jpg` | dish: Dal Bhat Tarkari Machha.jpg | Gaurav Dhwaj Khadka | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Dal_Bhat_Tarkari_Machha.jpg |
| `assets/cards/pak/animal.jpg` | animal: Markhor Schraubenziege Capra falconeri Zoo Augsburg-02.jpg | Rufus46 | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Markhor_Schraubenziege_Capra_falconeri_Zoo_Augsburg-02.jpg |
| `assets/cards/prk/animal.jpg` | animal: Siberian Tiger by Malene Th.jpg | Malene Thyssen | CC BY 2.5 | https://commons.wikimedia.org/wiki/File:Siberian_Tiger_by_Malene_Th.jpg |
| `assets/cards/qat/animal.jpg` | animal: Arabian oryx (oryx leucoryx).jpg | Charles J. Sharp | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Arabian_oryx_(oryx_leucoryx).jpg |
| `assets/cards/sau/dish.jpg` | dish: Kabsa.jpg | Basel15 at en.wikipedia | Public domain | https://commons.wikimedia.org/wiki/File:Kabsa.jpg |
| `assets/cards/syr/dish.jpg` | dish: Fried lamb kibbeh 1.JPG | Dr. Bernd Gross | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Fried_lamb_kibbeh_1.JPG |
| `assets/cards/tha/landmark.jpg` | landmark: Templo Wat Arun, Bangkok, Tailandia, 2013-08-22, DD 30.jpg | Diego Delso | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Templo_Wat_Arun,_Bangkok,_Tailandia,_2013-08-22,_DD_30.jpg |
| `assets/cards/tjk/animal.jpg` | animal: Snow leopard portrait-2010-07-09.jpg | Original: Tambako The Jaguar Derivative work: User:Niabot | CC BY-SA 2.0 | https://commons.wikimedia.org/wiki/File:Snow_leopard_portrait-2010-07-09.jpg |
| `assets/cards/tls/dish.jpg` | dish: Grilled fish in Tokyo.jpg | Syced | CC0 | https://commons.wikimedia.org/wiki/File:Grilled_fish_in_Tokyo.jpg |
| `assets/cards/uzb/animal.jpg` | animal: The deer of all lands (1898) Bukhara red deer.png | Richard Lydekker | Public domain | https://commons.wikimedia.org/wiki/File:The_deer_of_all_lands_(1898)_Bukhara_red_deer.png |
| `assets/cards/uzb/landmark.jpg` | landmark: Registan 01.jpg | Bernard Gagnon | CC0 | https://commons.wikimedia.org/wiki/File:Registan_01.jpg |
| `assets/cards/est/animal.jpg` | animal: Scandinavian grey wolf Canis lupus.jpg | Malene Thyssen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Scandinavian_grey_wolf_Canis_lupus.jpg |
| `assets/cards/pak/dish.jpg` | dish: A home made plate of mutton biryani served with chicken kassa cooked in the bengali style.jpg | Subhrajyoti07 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:A_home_made_plate_of_mutton_biryani_served_with_chicken_kassa_cooked_in_the_bengali_style.jpg |
| `assets/cards/tls/animal.jpg` | animal: Saltwater crocodile in Sundarbans National Park November 2024 by Tisha Mukherjee 01.jpg | Tisha Mukherjee | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Saltwater_crocodile_in_Sundarbans_National_Park_November_2024_by_Tisha_Mukherjee_01.jpg |
| `assets/cards/bgr/landmark.jpg` | landmark: EXTERIOR VIEW RILA MONASTERY, BULGARIA.jpg | JERRYE AND ROY KLOTZ MD | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:EXTERIOR_VIEW_RILA_MONASTERY,_BULGARIA.jpg |
| `assets/cards/egy/animal.jpg` | animal: Steppe Eagle 3.jpg | Manojkiri photography | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Steppe_Eagle_3.jpg |
| `assets/cards/est/currency.jpg` | currency: 20 cent Euro Coin Estonia 11202019 (2).jpg | Pachy184Derm | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:20_cent_Euro_Coin_Estonia_11202019_(2).jpg |
| `assets/cards/ind/currency.jpg` | currency: Different commemorative coins of 5 Rupee, India.jpg | Billjones94 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Different_commemorative_coins_of_5_Rupee,_India.jpg |
| `assets/cards/lao/animal.jpg` | animal: Sitting Asian elephant (Elephas maximus) bathing in Tad Lo river, Laos.jpg | Basile Morin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Sitting_Asian_elephant_(Elephas_maximus)_bathing_in_Tad_Lo_river,_Laos.jpg |
| `assets/cards/lva/animal.jpg` | animal: Bachstelze - Bergeronnette grise - White wagtail - Motacilla alba - 03.jpg | NorbertNagel | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Bachstelze_-_Bergeronnette_grise_-_White_wagtail_-_Motacilla_alba_-_03.jpg |
| `assets/cards/mmr/animal.jpg` | animal: Sitting Asian elephant (Elephas maximus) bathing in Tad Lo river, Laos.jpg | Basile Morin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Sitting_Asian_elephant_(Elephas_maximus)_bathing_in_Tad_Lo_river,_Laos.jpg |
| `assets/cards/syr/animal.jpg` | animal: Black arabian horse head.jpg | OliverSeitz | Public domain | https://commons.wikimedia.org/wiki/File:Black_arabian_horse_head.jpg |
| `assets/cards/tha/animal.jpg` | animal: Sitting Asian elephant (Elephas maximus) bathing in Tad Lo river, Laos.jpg | Basile Morin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Sitting_Asian_elephant_(Elephas_maximus)_bathing_in_Tad_Lo_river,_Laos.jpg |
| `assets/cards/vnm/landmark.jpg` | landmark: View of sea from Titov Island, Ha Long Bay, Vietnam, 20240128 1337 3732.jpg | Jakub Hałun | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:View_of_sea_from_Titov_Island,_Ha_Long_Bay,_Vietnam,_20240128_1337_3732.jpg |
| `assets/cards/yem/animal.jpg` | animal: Arabian Leopard Panthera pardus nimr in Sharjah Photo Prof Dr Norman Ali Khalaf.jpg | JaffaFalcon | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Arabian_Leopard_Panthera_pardus_nimr_in_Sharjah_Photo_Prof_Dr_Norman_Ali_Khalaf.jpg |
| `assets/cards/pak/landmark.jpg` | landmark: Picture of K2.jpg | Maria Ly from San Francisco, USA | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Picture_of_K2.jpg |
| `assets/cards/prk/landmark.jpg` | landmark: Paektu Mountain's Heaven Lake.jpg | SSchlhmr | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Paektu_Mountain%27s_Heaven_Lake.jpg |
| `assets/cards/nor/dish.jpg` | dish: Får i kål.jpg | Jarvin | CC BY 3.0 | https://commons.wikimedia.org/wiki/File:F%C3%A5r_i_k%C3%A5l.jpg |
| `assets/cards/omn/dish.jpg` | dish: Omani Halwa with saffron.jpg | Slywire | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Omani_Halwa_with_saffron.jpg |
| `assets/cards/kwt/dish.jpg` | dish: Machboos (cropped).JPG | Miansari66 | CC0 | https://commons.wikimedia.org/wiki/File:Machboos_(cropped).JPG |
| `assets/cards/qat/dish.jpg` | dish: Machboos (cropped).JPG | Miansari66 | CC0 | https://commons.wikimedia.org/wiki/File:Machboos_(cropped).JPG |
| `assets/cards/yem/dish.jpg` | dish: Saltah.jpg | Rania al-Bahara | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Saltah.jpg |
| `assets/cards/nor/currency.jpg` | currency: Norwegian 20kr front.png | Jørgen og Ida | CC0 | https://commons.wikimedia.org/wiki/File:Norwegian_20kr_front.png |
| `assets/flags/bgd.svg` | flag: Flag of Bangladesh.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Bangladesh.svg |
| `assets/flags/est.svg` | flag: Flag of Estonia.svg | Original: Unknown author Vector: SKopp, PeepP and ‍others | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Estonia.svg |
| `assets/flags/idn.svg` | flag: Flag of Indonesia.svg | Jayakatwang | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Indonesia.svg |
| `assets/flags/lva.svg` | flag: Flag of Latvia.svg | Original: Ansis Cīrulis Vector: SKopp | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Latvia.svg |
| `assets/flags/pol.svg` | flag: Flag of Poland.svg | See below. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Poland.svg |
| `assets/flags/rus.svg` | flag: Flag of Russia.svg | Peter the Great | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Russia.svg |
| `assets/flags/ukr.svg` | flag: Flag of Ukraine.svg | Government of Ukraine | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Ukraine.svg |
| `assets/flags/yem.svg` | flag: Flag of Yemen.svg | Nightstallion et al., see File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Yemen.svg |
| `assets/flags/omn.svg` | flag: Flag of Oman (3-2).svg | Sangjinhwa | Public domain | https://commons.wikimedia.org/wiki/File:Flag_of_Oman_(3-2).svg |
| `assets/cards/npl/animal.jpg` | animal: Cow (Fleckvieh breed) Oeschinensee Slaunger 2009-07-07.jpg | Kim Hansen | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File:Cow_(Fleckvieh_breed)_Oeschinensee_Slaunger_2009-07-07.jpg |
| `assets/cards/jpn/animal.jpg` | animal: Kopfstudie eines Japanmakaken (Macaca fuscata) im Jigokudani Yaen Kōen, Japan.jpg | Frank Schulenburg | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Kopfstudie_eines_Japanmakaken_%28Macaca_fuscata%29_im_Jigokudani_Yaen_K%C5%8Den%2C_Japan.jpg |
| `assets/cards/jpn/currency.jpg` | currency: 500 yen bicolor clad coin obverse.jpg | Heavy Frisker | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:500_yen_bicolor_clad_coin_obverse.jpg |
| `assets/cards/jpn/landmark.jpg` | landmark: Mount Fuji from Lake Kawaguchi 20170206.jpg | Suicasmo | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Mount_Fuji_from_Lake_Kawaguchi_20170206.jpg |
| `assets/cards/jpn/dish.jpg` | dish: Shoyu Ramen.jpg | Guilhem Vellut | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Shoyu_Ramen.jpg |
| `assets/cards/lka/animal.jpg` | animal: Sri Lankan Elephant (Elephas maximus maximus).jpg | Senthiaathavan | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Sri_Lankan_Elephant_%28Elephas_maximus_maximus%29.jpg |
| `assets/cards/lka/currency.jpg` | currency: Sri Lankan five rupee coin.jpg | AKS.9955 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ASri_Lankan_five_rupee_coin.jpg |
| `assets/cards/lka/landmark.jpg` | landmark: Sigiriya.jpg | Bernard Gagnon | CC BY-SA 3.0 | https://commons.wikimedia.org/wiki/File%3ASigiriya.jpg |
| `assets/cards/lka/dish.jpg` | dish: Sri Lankan Rice and Curry.jpg | Lankan Foodie | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ASri_Lankan_Rice_and_Curry.jpg |
| `assets/cards/phl/animal.jpg` | animal: Monkey-Eating Eagle (Philippine Eagle).jpg | Julan Shirwod Nueva | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3AMonkey-Eating_Eagle_%28Philippine_Eagle%29.jpg |
| `assets/cards/phl/currency.jpg` | currency: Philippines New Generation 1 peso coin reverse.png | Itsquietuptown | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3APhilippines_New_Generation_1_peso_coin_reverse.png |
| `assets/cards/phl/landmark.jpg` | landmark: Chocolate Hills Carmen Bohol 2019.jpg | Wolfgang Hägele | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3AChocolate_Hills_Carmen_Bohol_2019.jpg |
| `assets/cards/phl/dish.jpg` | dish: Chicken adobo.jpg | dbgg1979 on flickr | CC BY 2.0 | https://commons.wikimedia.org/wiki/File%3AChicken_adobo.jpg |
| `assets/cards/sgp/animal.jpg` | animal: Smooth Coated Otter 1.jpg | Red Eyes Black Dragon 92 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ASmooth_Coated_Otter_1.jpg |
| `assets/cards/sgp/currency.jpg` | currency: 10 dollars of Singapore - ASEAN 10th Anniversary 1977.png | Windrain | CC0 | https://commons.wikimedia.org/wiki/File%3A10_dollars_of_Singapore_-_ASEAN_10th_Anniversary_1977.png |
| `assets/cards/sgp/landmark.jpg` | landmark: Supertree Grove, Gardens by the Bay, Singapore1.jpg | Mustang Joe | CC0 | https://commons.wikimedia.org/wiki/File%3ASupertree_Grove%2C_Gardens_by_the_Bay%2C_Singapore1.jpg |
| `assets/cards/sgp/dish.jpg` | dish: Hainanese chicken rice in Singapore.jpg | Pauloleong2002 | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3AHainanese_chicken_rice_in_Singapore.jpg |
| `assets/cards/cyp/animal.jpg` | animal: Cyprus mouflon (Ovis gmelini ophion).jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ACyprus_mouflon_%28Ovis_gmelini_ophion%29.jpg |
| `assets/cards/cyp/currency.jpg` | currency: 1 Euro, Cyprus.jpg | Unknown authorUnknown author | CC BY 4.0 | https://commons.wikimedia.org/wiki/File%3A1_Euro%2C_Cyprus.jpg |
| `assets/cards/cyp/landmark.jpg` | landmark: Kourion Archaeological Site Cyprus.jpg | Salwa Farwaneh Dameh | CC0 | https://commons.wikimedia.org/wiki/File%3AKourion_Archaeological_Site_Cyprus.jpg |
| `assets/cards/cyp/dish.jpg` | dish: Grilled haloumi cheese in Cyprus.JPG | Anatoliy Smaga | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3AGrilled_haloumi_cheese_in_Cyprus.JPG |
| `assets/cards/bhr/animal.jpg` | animal: White-eared bulbul (Pycnonotus leucotis leucotis).jpg | Charles J. Sharp | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3AWhite-eared_bulbul_%28Pycnonotus_leucotis_leucotis%29.jpg |
| `assets/cards/bhr/currency.jpg` | currency: 500 Fils of Bahrain - Isa bin Salman (Isa Town) - 1968.jpg | Windrain | CC0 | https://commons.wikimedia.org/wiki/File%3A500_Fils_of_Bahrain_-_Isa_bin_Salman_%28Isa_Town%29_-_1968.jpg |
| `assets/cards/bhr/landmark.jpg` | landmark: Bahrain Fort March 2015.JPG | Martin Falbisoner | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ABahrain_Fort_March_2015.JPG |
| `assets/cards/bhr/dish.jpg` | dish: Balaleet 2019.jpg | Droodkin | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File%3ABalaleet_2019.jpg |
| `assets/flags/jpn.svg` | flag: Flag of Japan.svg | Various | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_Japan.svg |
| `assets/flags/lka.svg` | flag: Flag of Sri Lanka.svg | Original: Sri Lanka Vectorization: Zscout370, Mike Rohsopht | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_Sri_Lanka.svg |
| `assets/flags/phl.svg` | flag: Flag of the Philippines.svg | See File history below for details. | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_the_Philippines.svg |
| `assets/flags/sgp.svg` | flag: Flag of Singapore.svg | Original: Government of Singapore Vector: Zscout370 | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_Singapore.svg |
| `assets/flags/cyp.svg` | flag: Flag of Cyprus.svg | İsmet Güney, SVG by User:Vzb83~commonswiki | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_Cyprus.svg |
| `assets/flags/bhr.svg` | flag: Flag of Bahrain.svg | Source: Drawn by SKopp, rewritten by Zscout370 | Public domain | https://commons.wikimedia.org/wiki/File%3AFlag_of_Bahrain.svg |
