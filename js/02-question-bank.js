
// BECE Mock Master - Full 200 Questions Database
const questionsDB = {
  social: [
{ id:"soc-1", topic:"Environment & Physical Features", question:"Which relief feature occupies the largest portion of Ghana's total land area?", options:[{key:"A",text:"The Akwapim-Togo Ranges"},{key:"B",text:"The Volta River Basin"},{key:"C",text:"The Gambaga Escarpment"},{key:"D",text:"The Kwahu Plateau"}], correct:"B", explanation:"The Volta Basin is Ghana's largest relief region, covering roughly 45% of the country. This lowland relief region is different from the larger drainage basin of the Volta river system.", hint:"Think of the broad low-lying region associated with the Volta system." },
{ id:"soc-2", topic:"Government & The 1992 Constitution", question:"Under the 1992 Constitution, the primary function of the Judiciary is to:", options:[{key:"A",text:"Enforce national decisions made by the military"},{key:"B",text:"Make and amend laws for the Republic"},{key:"C",text:"Interpret the constitution and administer justice"},{key:"D",text:"Approve the appointment of Cabinet Ministers"}], correct:"C", explanation:"Separation of powers assigns law-making to Parliament (Legislature), policy implementation to the Executive, and constitutional interpretation/justice to the Judiciary.", hint:"The Judiciary includes all courts of law headed by the Chief Justice." },
{ id:"soc-3", topic:"Socio-Economic Development", question:"The most sustainable approach to curtailing rural-urban migration is:", options:[{key:"A",text:"Imposing heavy toll taxes on city-bound highways"},{key:"B",text:"Providing social amenities, electricity, and agro-industries in rural areas"},{key:"C",text:"Arresting and deporting migrants back to villages"},{key:"D",text:"Demolishing informal settlements without alternatives"}], correct:"B", explanation:"Rural-urban migration is driven by lack of jobs and infrastructure. Investing in rural amenities eliminates push factors.", hint:"Solve the root reason youths leave their villages." },
{ id:"soc-4", topic:"Culture and National Identity", question:"The constitutional organ designated to settle chieftaincy disputes is the:", options:[{key:"A",text:"National and Regional Houses of Chiefs"},{key:"B",text:"Ghana Police Service"},{key:"C",text:"District Chief Executive (DCE)"},{key:"D",text:"Ministry of Local Government"}], correct:"A", explanation:"The 1992 Constitution gives the Judicial Committees of Traditional Councils, Regional and National Houses of Chiefs jurisdiction over chieftaincy matters.", hint:"Chiefs have their own specialized house recognized by law." },
{ id:"soc-5", topic:"Sustainable Resource Management", question:"A destructive impact of illegal surface mining (galamsey) is:", options:[{key:"A",text:"Accelerated growth of indigenous timber"},{key:"B",text:"Siltation and heavy metal poisoning of rivers like the Pra and Birim"},{key:"C",text:"High yields of cocoa pods"},{key:"D",text:"Conservation of underground water tables"}], correct:"B", explanation:"Illegal surface mining can strip vegetation and topsoil, causing erosion and siltation. Unsafe gold-processing practices may also release harmful substances, including mercury, into water bodies.", hint:"Think about exposed soil washing into rivers and unsafe processing chemicals entering the water." },
{ id:"soc-6", topic:"Ghana History — Colonization", question:"The 1948 Christiansborg Crossroad shooting incident led directly to the formation of the:", options:[{key:"A",text:"Aborigines' Rights Protection Society (ARPS)"},{key:"B",text:"Watson Commission"},{key:"C",text:"United Gold Coast Convention (UGCC)"},{key:"D",text:"Fante Confederation"}], correct:"B", explanation:"After the shooting of ex-servicemen, the British colonial government appointed the Watson Commission to investigate the disturbances.", hint:"A British commission named after Aiken Watson." },
{ id:"soc-7", topic:"Socialization & The Family", question:"In the traditional Ghanaian matrilineal system, inheritance is traced through the:", options:[{key:"A",text:"Father's direct brothers"},{key:"B",text:"Mother's lineage and brothers"},{key:"C",text:"Paternal grandmother only"},{key:"D",text:"Eldest son of the deceased"}], correct:"B", explanation:"In matrilineal societies (such as the Akans), property inheritance passes through the maternal lineage (e.g. from uncle to nephew).", hint:"'Matri' comes from the Latin root for mother." },
{ id:"soc-8", topic:"State Symbols & Patriotism", question:"The designer of the National Flag of Ghana was:", options:[{key:"A",text:"Dr. Ephraim Amu"},{key:"B",text:"Theodosia Salome Okoh"},{key:"C",text:"Amon Kotei"},{key:"D",text:"Kofi Antubam"}], correct:"B", explanation:"Mrs. Theodosia Okoh designed the red, gold, green, and black-star flag in 1957. Amon Kotei designed the Coat of Arms.", hint:"A prominent Ghanaian female artist with a hockey stadium named after her." },
{ id:"soc-9", topic:"International Cooperation", question:"A founding objective of ECOWAS is to:", options:[{key:"A",text:"Promote regional economic integration and free movement of goods and persons"},{key:"B",text:"Impose a common political constitution on all member states"},{key:"C",text:"Abolish all national defence armies"},{key:"D",text:"Collect taxes directly from West African citizens"}], correct:"A", explanation:"ECOWAS, established in 1975 in Lagos, exists to foster economic cooperation, trade liberalization, and free movement across West African borders.", hint:"Focus on trade and travel across Ghana, Nigeria, Togo etc." },
{ id:"soc-10", topic:"Peace and Conflict Resolution", question:"The most civil way of resolving communal conflicts in modern Ghana is through:", options:[{key:"A",text:"Military intimidation and reprisals"},{key:"B",text:"Dialogue, mediation, and alternative dispute resolution (ADR)"},{key:"C",text:"Youth vigilantism"},{key:"D",text:"Forced relocation of rival groups"}], correct:"B", explanation:"Dialogue and ADR bring disputing parties to mutual consensus, preserving long-term social harmony.", hint:"Talking things through with a trusted mediator." },
{ id:"soc-11", topic:"Maps & Scale Drawing", question:"A map scale of 1:50,000 means that 1 cm on the map represents:", options:[{key:"A",text:"50 metres on the ground"},{key:"B",text:"500 metres on the ground"},{key:"C",text:"5 kilometres on the ground"},{key:"D",text:"50 kilometres on the ground"}], correct:"B", explanation:"1:50,000 means 1 cm = 50,000 cm = 500 m. To convert: divide by 100 to get metres, or by 100,000 to get km.", hint:"Convert 50,000 cm to metres by dividing by 100." },
{ id:"soc-12", topic:"Population & Census", question:"A national population census is important primarily because it helps the government to:", options:[{key:"A",text:"Monitor people's religious affiliations"},{key:"B",text:"Plan the distribution of social services and resources"},{key:"C",text:"Control the movement of citizens"},{key:"D",text:"Determine which political party to vote for"}], correct:"B", explanation:"Census data guides government in allocating schools, hospitals, roads, and electoral constituencies based on population size and distribution.", hint:"Think about how government decides where to build schools and hospitals." },
{ id:"soc-13", topic:"Ghana History — Pre-Colonial", question:"The Ashanti Empire's system of governance was best described as:", options:[{key:"A",text:"A republic with elected presidents"},{key:"B",text:"A confederacy of states under the Asantehene and the Golden Stool"},{key:"C",text:"A military dictatorship"},{key:"D",text:"A colony of the British Crown"}], correct:"B", explanation:"The Ashanti Empire was a confederacy of Akan states united under the authority of the Asantehene and the sacred Golden Stool (Sika Dwa Kofi), which symbolised national unity.", hint:"Think about the powerful symbol that united all the Ashanti states." },
{ id:"soc-14", topic:"Human Rights", question:"Which of the following is a fundamental human right guaranteed in Chapter 5 of the 1992 Constitution of Ghana?", options:[{key:"A",text:"Right to free unlimited internet access"},{key:"B",text:"Right to own any foreign country's passport"},{key:"C",text:"Right to life, liberty, and personal security"},{key:"D",text:"Right to carry firearms without a licence"}], correct:"C", explanation:"Chapter 5 of the 1992 Constitution guarantees fundamental freedoms including the right to life, personal liberty, dignity, fair trial, and freedom of speech.", hint:"The most basic rights that protect your existence and freedom." },
{ id:"soc-15", topic:"The District Assembly System", question:"The highest political authority in a district in Ghana is the:", options:[{key:"A",text:"Regional Minister"},{key:"B",text:"Member of Parliament"},{key:"C",text:"District Assembly"},{key:"D",text:"Traditional Chief"}], correct:"C", explanation:"Under the Local Government Act, the District Assembly is the highest political and administrative authority in the district, responsible for development planning and basic services.", hint:"It's the local government body where Assembly Members deliberate." },
{ id:"soc-16", topic:"Agriculture & Food Security", question:"The practice of growing different crops on the same piece of land in successive seasons is known as:", options:[{key:"A",text:"Mono-cropping"},{key:"B",text:"Crop rotation"},{key:"C",text:"Bush fallowing"},{key:"D",text:"Mixed farming"}], correct:"B", explanation:"Crop rotation helps maintain soil fertility, reduces pest build-up, and increases yield sustainability without chemical dependence.", hint:"Rotating what you plant each farming season." },
{ id:"soc-17", topic:"Tourism in Ghana", question:"The Cape Coast Castle and Elmina Castle are important tourist sites mainly because they:", options:[{key:"A",text:"Were built by the Ashanti Empire as palaces"},{key:"B",text:"Serve as the headquarters of the Ghana Tourism Authority"},{key:"C",text:"Are UNESCO World Heritage Sites linked to the Trans-Atlantic Slave Trade"},{key:"D",text:"Were constructed after Ghana's independence in 1957"}], correct:"C", explanation:"Both castles were European-built forts used as holding points during the slave trade. They are now UNESCO World Heritage Sites and important sites of memory.", hint:"Think about their painful historical significance to Africa and the diaspora." },
{ id:"soc-18", topic:"Health & Sanitation", question:"Malaria is transmitted to humans through the bite of:", options:[{key:"A",text:"The tsetse fly"},{key:"B",text:"The female Anopheles mosquito"},{key:"C",text:"Houseflies"},{key:"D",text:"Cockroaches"}], correct:"B", explanation:"The female Anopheles mosquito carries the Plasmodium parasite and transmits it when it bites humans to feed on blood. (The tsetse fly causes sleeping sickness, not malaria.)", hint:"A specific type of mosquito that breeds in stagnant water." },
{ id:"soc-19", topic:"Maps & Scale Drawing", question:"The symbol used to show rivers and water bodies on a topographic map is usually the colour:", options:[{key:"A",text:"Green"},{key:"B",text:"Brown"},{key:"C",text:"Blue"},{key:"D",text:"Red"}], correct:"C", explanation:"On standard topographic maps: blue = water (rivers, lakes), green = vegetation, brown = contour lines/relief, red/black = roads and settlements.", hint:"Think about the colour of water itself." },
{ id:"soc-20", topic:"Government & The 1992 Constitution", question:"The Speaker of Parliament in Ghana is elected by:", options:[{key:"A",text:"The President of the Republic"},{key:"B",text:"The Judicial Council"},{key:"C",text:"Members of Parliament from their own number or from outside"},{key:"D",text:"Citizens through a national referendum"}], correct:"C", explanation:"Article 95 of the 1992 Constitution provides that the Speaker shall be elected by Members of Parliament from among their own members or from persons who are qualified to be elected as MPs.", hint:"MPs themselves choose this person to preside over their sittings." },
{
  id: "soc-21",
  topic: "Environment & Physical Features",
  question: "Which of the following is the largest man-made lake in the world by surface area?",
  options: [
    { key: "A", text: "Lake Bosomtwe" },
    { key: "B", text: "Lake Volta" },
    { key: "C", text: "Lake Victoria" },
    { key: "D", text: "Lake Chad" }
  ],
  correct: "B",
  explanation: "Lake Volta, created by the Akosombo Dam on the Volta River in 1965, is the largest man-made lake in the world by surface area, covering about 8,502 square kilometres. Lake Victoria is a natural lake, and Lake Bosomtwe is a natural crater lake in the Ashanti Region.",
  hint: "Think about which lake was created by the construction of a dam in Ghana."
},
{
  id: "soc-22",
  topic: "Environment & Physical Features",
  question: "The coastal savanna vegetation zone in Ghana is characterised by which of the following?",
  options: [
    { key: "A", text: "Dense tropical rainforest with tall trees" },
    { key: "B", text: "Short grasses and scrub with few trees" },
    { key: "C", text: "Mangrove swamps throughout the entire zone" },
    { key: "D", text: "Thick evergreen forest with heavy rainfall" }
  ],
  correct: "B",
  explanation: "The coastal savanna zone, found mainly around the Accra Plains, is characterised by short grasses, scrub, and scattered trees. It receives relatively low rainfall compared to the forest zone, making it drier with less dense vegetation.",
  hint: "Consider the type of vegetation you would find in the dry Accra Plains area."
},
{
  id: "soc-23",
  topic: "Environment & Physical Features",
  question: "Which relief region of Ghana is known for having the highest point, Mount Afadjato?",
  options: [
    { key: "A", text: "The Volta Range" },
    { key: "B", text: "The Kwahu Plateau" },
    { key: "C", text: "The Gambaga Escarpment" },
    { key: "D", text: "The Coastal Plains" }
  ],
  correct: "A",
  explanation: "Mount Afadjato (885 metres), Ghana's highest point, is located in the Volta Range (also called the Akwapim-Togo Ranges) in the eastern part of the country near the Togo border. The Kwahu Plateau and Gambaga Escarpment are separate relief regions.",
  hint: "This mountain is found in the eastern highlands near the border with Togo."
},
{
  id: "soc-24",
  topic: "Environment & Physical Features",
  question: "Ghana has three main drainage basins. Which of the following river systems forms the largest drainage basin?",
  options: [
    { key: "A", text: "The Ankobra River system" },
    { key: "B", text: "The Pra River system" },
    { key: "C", text: "The Volta River system" },
    { key: "D", text: "The Tano River system" }
  ],
  correct: "C",
  explanation: "The Volta River system (including the Black Volta, White Volta, and Oti River) forms the largest drainage basin in Ghana, covering about 70% of the total land area. The Pra, Ankobra, and Tano rivers form part of the south-western river systems with much smaller basins.",
  hint: "This river system covers roughly two-thirds of Ghana's total land area."
},
{
  id: "soc-25",
  topic: "Environment & Physical Features",
  question: "Which climate zone in Ghana experiences a double maximum rainfall pattern?",
  options: [
    { key: "A", text: "The Northern Savanna zone" },
    { key: "B", text: "The South-Western Equatorial zone" },
    { key: "C", text: "The Dry Equatorial zone" },
    { key: "D", text: "The Tropical Continental zone" }
  ],
  correct: "B",
  explanation: "The South-Western Equatorial climate zone experiences two rainy seasons (double maxima): the major season from March to July and the minor season from September to November. The Northern Savanna zone has only one rainy season (single maximum).",
  hint: "This zone is in southern Ghana and has two distinct rainy seasons each year."
},
{
  id: "soc-26",
  topic: "Environment & Physical Features",
  question: "Which type of soil is commonly found in the forest zone of Ghana and supports the growing of cocoa?",
  options: [
    { key: "A", text: "Sandy desert soils" },
    { key: "B", text: "Forest ochrosols" },
    { key: "C", text: "Laterite soils" },
    { key: "D", text: "Alluvial soils" }
  ],
  correct: "B",
  explanation: "Forest ochrosols are rich, fertile soils found in the forest zones of Ghana. They contain organic matter from decomposed leaves and support the cultivation of cocoa, oil palm, and other tree crops. Laterite soils are more common in the savanna regions.",
  hint: "These soils are enriched by the leaf litter that falls from the forest canopy."
},
{
  id: "soc-27",
  topic: "Maps, Scale & Directions",
  question: "On a map with a scale of 1:50,000, a distance of 4 cm on the map represents what actual distance on the ground?",
  options: [
    { key: "A", text: "2 km" },
    { key: "B", text: "20 km" },
    { key: "C", text: "200 km" },
    { key: "D", text: "0.2 km" }
  ],
  correct: "A",
  explanation: "Using the scale 1:50,000, 4 cm on the map = 4 × 50,000 = 200,000 cm on the ground. Converting to kilometres: 200,000 ÷ 100,000 = 2 km. Always multiply the map distance by the scale factor, then convert units.",
  hint: "Multiply the map distance by 50,000, then convert centimetres to kilometres."
},
{
  id: "soc-28",
  topic: "Maps, Scale & Directions",
  question: "What do closely spaced contour lines on a topographic map indicate?",
  options: [
    { key: "A", text: "A flat plain" },
    { key: "B", text: "A gentle slope" },
    { key: "C", text: "A steep slope" },
    { key: "D", text: "A river valley" }
  ],
  correct: "C",
  explanation: "When contour lines are drawn close together, it means the elevation changes rapidly over a short horizontal distance, indicating a steep slope. Widely spaced contour lines indicate a gentle slope or relatively flat terrain.",
  hint: "Think about what happens when height changes a lot in a short distance."
},
{
  id: "soc-29",
  topic: "Maps, Scale & Directions",
  question: "A bearing of 225° from North corresponds to which compass direction?",
  options: [
    { key: "A", text: "North-West" },
    { key: "B", text: "South-East" },
    { key: "C", text: "South-West" },
    { key: "D", text: "North-East" }
  ],
  correct: "C",
  explanation: "Bearings are measured clockwise from North. South is at 180° and West is at 270°. A bearing of 225° falls exactly between South (180°) and West (270°), making it South-West. North-West would be 315°.",
  hint: "Bearings go clockwise from North: 0° = N, 90° = E, 180° = S, 270° = W."
},
{
  id: "soc-30",
  topic: "Maps, Scale & Directions",
  question: "Which of the following is the correct way to read a four-figure grid reference?",
  options: [
    { key: "A", text: "Read the northing first, then the easting" },
    { key: "B", text: "Read the easting first, then the northing" },
    { key: "C", text: "Read the latitude first, then the longitude" },
    { key: "D", text: "Read the vertical line first, then the diagonal" }
  ],
  correct: "B",
  explanation: "Grid references are read by going along the horizontal axis (eastings) first, then up the vertical axis (northings). The rule is 'along the corridor, then up the stairs' — eastings before northings.",
  hint: "Remember: 'along the corridor, then up the stairs.'"
},
{
  id: "soc-31",
  topic: "Maps, Scale & Directions",
  question: "On a topographic map, a blue line running through the landscape typically represents which feature?",
  options: [
    { key: "A", text: "A main road" },
    { key: "B", text: "A river or stream" },
    { key: "C", text: "A railway line" },
    { key: "D", text: "An international boundary" }
  ],
  correct: "B",
  explanation: "On topographic maps, blue is the conventional colour used to represent water features such as rivers, streams, lakes, and the sea. Roads are usually shown in red or brown, railway lines as black lines with cross marks, and boundaries as broken lines.",
  hint: "Think about which colour is universally associated with water."
},
{
  id: "soc-32",
  topic: "Government & The 1992 Constitution",
  question: "According to the 1992 Constitution of Ghana, the three arms of government are the Executive, the Legislature, and the __(?)__.",
  options: [
    { key: "A", text: "Military" },
    { key: "B", text: "Judiciary" },
    { key: "C", text: "Civil Service" },
    { key: "D", text: "Electoral Commission" }
  ],
  correct: "B",
  explanation: "The 1992 Constitution establishes three arms of government: the Executive (headed by the President), the Legislature (Parliament), and the Judiciary (headed by the Chief Justice). This separation of powers ensures checks and balances in governance.",
  hint: "This arm of government is responsible for interpreting the laws of the land."
},
{
  id: "soc-33",
  topic: "Government & The 1992 Constitution",
  question: "Who is the head of the Cabinet in Ghana?",
  options: [
    { key: "A", text: "The Vice President" },
    { key: "B", text: "The Speaker of Parliament" },
    { key: "C", text: "The President" },
    { key: "D", text: "The Chief Justice" }
  ],
  correct: "C",
  explanation: "Under the 1992 Constitution, the Cabinet is chaired by the President of the Republic. The Cabinet consists of the President, the Vice President, and Ministers of State. It is the highest executive decision-making body of the government.",
  hint: "The Cabinet is part of the Executive arm, which is headed by this person."
},
{
  id: "soc-34",
  topic: "Government & The 1992 Constitution",
  question: "What is the primary function of the Council of State in Ghana?",
  options: [
    { key: "A", text: "To make laws for the country" },
    { key: "B", text: "To advise the President on national matters" },
    { key: "C", text: "To try criminal cases in court" },
    { key: "D", text: "To collect taxes for the government" }
  ],
  correct: "B",
  explanation: "The Council of State is an advisory body established under Chapter 9 of the 1992 Constitution. Its main function is to counsel the President on matters of national importance. It does not make laws (that is Parliament's role) or try cases (that is the Judiciary's role).",
  hint: "This body gives guidance and counsel to the head of the Executive."
},
{
  id: "soc-35",
  topic: "Government & The 1992 Constitution",
  question: "The Speaker of Parliament in Ghana is elected by whom?",
  options: [
    { key: "A", text: "The President of Ghana" },
    { key: "B", text: "The Chief Justice" },
    { key: "C", text: "The Members of Parliament" },
    { key: "D", text: "The Electoral Commission" }
  ],
  correct: "C",
  explanation: "The Speaker of Parliament is elected by the Members of Parliament (MPs) from among persons who are members or non-members of Parliament. The Speaker presides over parliamentary debates and maintains order during sittings.",
  hint: "The person who leads Parliament is chosen by the people who sit in Parliament."
},
{
  id: "soc-36",
  topic: "Government & The 1992 Constitution",
  question: "Who serves as the chief legal adviser to the Government of Ghana?",
  options: [
    { key: "A", text: "The Chief Justice" },
    { key: "B", text: "The Attorney General and Minister for Justice" },
    { key: "C", text: "The Speaker of Parliament" },
    { key: "D", text: "The Auditor General" }
  ],
  correct: "B",
  explanation: "The Attorney General is the chief legal adviser to the Government of Ghana, as stated in the 1992 Constitution. The Attorney General also serves as the Minister for Justice and is responsible for all legal proceedings on behalf of the state. The Chief Justice heads the Judiciary but does not advise government.",
  hint: "This person holds a dual title combining legal advice and a ministerial portfolio."
},
{
  id: "soc-37",
  topic: "Government & The 1992 Constitution",
  question: "Under the 1992 Constitution, a President of Ghana can be removed from office through a process known as __(?)__.",
  options: [
    { key: "A", text: "A vote of no confidence" },
    { key: "B", text: "Impeachment" },
    { key: "C", text: "A military coup" },
    { key: "D", text: "A national referendum" }
  ],
  correct: "B",
  explanation: "Article 69 of the 1992 Constitution provides for the removal of the President through impeachment. The process is initiated by a written notice to the Speaker of Parliament, signed by not less than one-third of all MPs, and requires investigation by a committee and a two-thirds majority vote.",
  hint: "This constitutional process involves Parliament formally charging the President with misconduct."
},
{
  id: "soc-38",
  topic: "The District Assembly System",
  question: "In the District Assembly system of Ghana, what percentage of members are elected by universal adult suffrage?",
  options: [
    { key: "A", text: "50%" },
    { key: "B", text: "30%" },
    { key: "C", text: "70%" },
    { key: "D", text: "100%" }
  ],
  correct: "C",
  explanation: "Under Ghana's local government system, 70% of District Assembly members are elected by the people through universal adult suffrage on a non-partisan basis. The remaining 30% are appointed by the President in consultation with traditional authorities and interest groups in the district.",
  hint: "The majority of assembly members are directly chosen by voters in the district."
},
{
  id: "soc-39",
  topic: "The District Assembly System",
  question: "Which of the following is a function of the District Assembly?",
  options: [
    { key: "A", text: "Declaring war on behalf of Ghana" },
    { key: "B", text: "Appointing Supreme Court judges" },
    { key: "C", text: "Preparing and approving the district development plan" },
    { key: "D", text: "Printing currency for the national economy" }
  ],
  correct: "C",
  explanation: "District Assemblies are responsible for the overall development of their districts, including preparing and approving development plans and budgets, levying local rates and fees, and providing basic infrastructure. Declaring war and appointing judges are functions of the central government.",
  hint: "District Assemblies focus on local development and governance within their area."
},
{
  id: "soc-40",
  topic: "The District Assembly System",
  question: "The Unit Committee is the lowest level of the local government structure in Ghana. How many elected members does it have?",
  options: [
    { key: "A", text: "15 members" },
    { key: "B", text: "10 members" },
    { key: "C", text: "5 members" },
    { key: "D", text: "20 members" }
  ],
  correct: "C",
  explanation: "A Unit Committee consists of not more than 5 elected persons and not more than 5 persons nominated by the District Chief Executive acting on behalf of the President. The elected members serve the local electoral area and bring grassroots governance to the community level.",
  hint: "This is a small committee that works at the community level — think of a small number."
},
{
  id: "soc-41",
  topic: "The District Assembly System",
  question: "The District Chief Executive (DCE) is appointed by whom?",
  options: [
    { key: "A", text: "The elected Assembly Members" },
    { key: "B", text: "The President with the approval of two-thirds of the Assembly" },
    { key: "C", text: "The Regional Minister" },
    { key: "D", text: "The people through a district election" }
  ],
  correct: "B",
  explanation: "The DCE is nominated by the President and must be approved by two-thirds of the members of the District Assembly. This ensures both central government input and local acceptance. The DCE serves as the chief representative of the central government in the district.",
  hint: "The head of state nominates this person, but the local assembly must endorse the choice."
},
{
  id: "soc-42",
  topic: "Ghana History Pre-Colonial",
  question: "The Golden Stool of the Ashanti Kingdom symbolises which of the following?",
  options: [
    { key: "A", text: "The wealth of the royal family" },
    { key: "B", text: "The soul and unity of the Ashanti nation" },
    { key: "C", text: "The military power of the Ashanti army" },
    { key: "D", text: "The trading success of the Ashanti merchants" }
  ],
  correct: "B",
  explanation: "The Golden Stool (Sika Dwa Kofi) is believed to contain the spirit and soul of the entire Ashanti nation. According to tradition, the priest Okomfo Anokye conjured it from the sky during the reign of Osei Tutu I. It is never sat upon and represents the unity of all Ashanti people.",
  hint: "This sacred object represents something deeper than just material wealth — it is about the people."
},
{
  id: "soc-43",
  topic: "Ghana History Pre-Colonial",
  question: "The Fante Confederacy was formed primarily to do which of the following?",
  options: [
    { key: "A", text: "Trade gold with the Portuguese" },
    { key: "B", text: "Unite Fante states against Ashanti invasion" },
    { key: "C", text: "Establish Islam in the coastal areas" },
    { key: "D", text: "Build the Elmina Castle" }
  ],
  correct: "B",
  explanation: "The Fante Confederacy (established in 1868) was formed to unite the various Fante states along the coast to resist the military expansion of the Ashanti Empire. It also sought to establish self-governance among the Fante, but its primary motivation was collective defence against Ashanti incursions.",
  hint: "The coastal Fante people needed to come together to resist a powerful inland kingdom."
},
{
  id: "soc-44",
  topic: "Ghana History Pre-Colonial",
  question: "Which European nation was the first to arrive at the coast of present-day Ghana and established trade at Elmina in 1471?",
  options: [
    { key: "A", text: "The British" },
    { key: "B", text: "The Dutch" },
    { key: "C", text: "The Portuguese" },
    { key: "D", text: "The French" }
  ],
  correct: "C",
  explanation: "The Portuguese were the first Europeans to arrive at the Gold Coast. They reached Elmina in 1471 and later built the Elmina Castle (São Jorge da Mina) in 1482, which was the first European trading post in sub-Saharan Africa. The Dutch arrived later and captured the castle in 1637.",
  hint: "This European country was known for pioneering maritime exploration along the West African coast."
},
{
  id: "soc-45",
  topic: "Ghana History Pre-Colonial",
  question: "Which of the following kingdoms was located in the northern part of present-day Ghana?",
  options: [
    { key: "A", text: "The Denkyira Kingdom" },
    { key: "B", text: "The Dagbon Kingdom" },
    { key: "C", text: "The Akyem Kingdom" },
    { key: "D", text: "The Fante Kingdom" }
  ],
  correct: "B",
  explanation: "The Dagbon Kingdom, with its capital at Yendi, is one of the oldest and most organised traditional states in northern Ghana. The Denkyira, Akyem, and Fante kingdoms were all located in the southern and central parts of present-day Ghana.",
  hint: "This kingdom has its traditional capital at Yendi in what is now the Northern Region."
},
{
  id: "soc-46",
  topic: "Ghana History Pre-Colonial",
  question: "The Trans-Saharan trade was important to the people of northern Ghana because it enabled them to trade gold and kola nuts for which of the following?",
  options: [
    { key: "A", text: "Firearms and ammunition from the coast" },
    { key: "B", text: "Salt, cloth, and other goods from North Africa" },
    { key: "C", text: "Cocoa and rubber from the forest zone" },
    { key: "D", text: "Ships and navigation equipment from Europe" }
  ],
  correct: "B",
  explanation: "Through the Trans-Saharan trade routes, the people of northern Ghana exchanged gold, kola nuts, and other local products for salt, cloth, horses, and manufactured goods from North Africa. This trade also facilitated the spread of Islam into the region.",
  hint: "Goods came across the Sahara Desert from the Mediterranean and North Africa."
},
{
  id: "soc-47",
  topic: "Ghana History Colonial",
  question: "The Bond of 1844 was an agreement between the British and the chiefs of which area?",
  options: [
    { key: "A", text: "The Northern Territories" },
    { key: "B", text: "Ashanti" },
    { key: "C", text: "The Fante and other coastal states" },
    { key: "D", text: "The Volta Region" }
  ],
  correct: "C",
  explanation: "The Bond of 1844 was signed between Commander H. Worsley Hill and the chiefs of the Fante and other coastal states (including Denkyira, Assin, and others). It gave the British judicial authority over certain criminal cases and laid the foundation for British colonial rule on the Gold Coast.",
  hint: "This agreement was made with chiefs who lived along the southern coast of the Gold Coast."
},
{
  id: "soc-48",
  topic: "Ghana History Colonial",
  question: "The Sagrenti War of 1874 was fought between the British and which group?",
  options: [
    { key: "A", text: "The Fante Confederacy" },
    { key: "B", text: "The Ashanti Empire" },
    { key: "C", text: "The Ewe people" },
    { key: "D", text: "The Dagomba Kingdom" }
  ],
  correct: "B",
  explanation: "The Sagrenti War (1874) was fought between the British, led by Sir Garnet Wolseley (whom the Ashantis called 'Sagrenti'), and the Ashanti Empire. The British invaded Kumasi and burned parts of it. This war resulted in the Treaty of Fomena, which weakened Ashanti power.",
  hint: "The name 'Sagrenti' is the local pronunciation of the British commander's name — the war was against the most powerful inland kingdom."
},
{
  id: "soc-49",
  topic: "Ghana History Colonial",
  question: "In which year was the Burns Constitution introduced, and what was its major significance?",
  options: [
    { key: "A", text: "1925 — It abolished slavery on the Gold Coast" },
    { key: "B", text: "1946 — It gave Africans a majority in the Legislative Council for the first time" },
    { key: "C", text: "1950 — It granted full independence to the Gold Coast" },
    { key: "D", text: "1935 — It established the first parliament in West Africa" }
  ],
  correct: "B",
  explanation: "The Burns Constitution of 1946, named after Governor Sir Alan Burns, was significant because it was the first time Africans had a majority in the Legislative Council. It had 18 elected African members out of 31, giving Africans more representation in governance than ever before under colonial rule.",
  hint: "This constitution was a milestone in African representation in colonial governance."
},
{
  id: "soc-50",
  topic: "Ghana History Colonial",
  question: "The United Gold Coast Convention (UGCC) was formed in 1947 with the aim of achieving self-governance. Who was invited as its General Secretary?",
  options: [
    { key: "A", text: "J.B. Danquah" },
    { key: "B", text: "Kwame Nkrumah" },
    { key: "C", text: "Obetsebi Lamptey" },
    { key: "D", text: "Edward Akufo-Addo" }
  ],
  correct: "B",
  explanation: "Kwame Nkrumah was invited from London to serve as the General Secretary of the UGCC in 1947. He later broke away from the UGCC to form the Convention People's Party (CPP) in 1949 because he favoured immediate 'Self-Government Now' while the UGCC wanted independence 'in the shortest possible time.'",
  hint: "This person later became the first Prime Minister and President of Ghana."
},
{
  id: "soc-51",
  topic: "Ghana History Colonial",
  question: "The Coussey Committee was set up after the 1948 riots to do which of the following?",
  options: [
    { key: "A", text: "Investigate the causes of World War II" },
    { key: "B", text: "Draft a new constitution for the Gold Coast" },
    { key: "C", text: "Abolish chieftaincy in the Gold Coast" },
    { key: "D", text: "Establish trade routes with the Portuguese" }
  ],
  correct: "B",
  explanation: "The Coussey Committee, chaired by Justice Henley Coussey, was set up in 1949 following the 1948 Accra riots and the Watson Commission report. Its task was to recommend a new constitutional framework that would give Ghanaians greater self-governance. Its recommendations led to the 1950 Constitution.",
  hint: "This committee was formed after civil unrest and was tasked with planning the political future of the colony."
},
{
  id: "soc-52",
  topic: "Culture, Socialization & Family",
  question: "In Ghanaian tradition, the naming ceremony (outdooring) is usually performed on which day after the birth of a child?",
  options: [
    { key: "A", text: "The 1st day" },
    { key: "B", text: "The 3rd day" },
    { key: "C", text: "The 8th day" },
    { key: "D", text: "The 21st day" }
  ],
  correct: "C",
  explanation: "In most Ghanaian cultures, the naming ceremony or outdooring is performed on the 8th day after birth. This is when the child is formally presented to the community and given a name. The 8-day wait was traditionally observed because infant mortality was high and the child needed to survive the first week.",
  hint: "The child is kept indoors for about a week before being formally introduced to the community."
},
{
  id: "soc-53",
  topic: "Culture, Socialization & Family",
  question: "In a matrilineal system of inheritance, a person inherits property through which side of the family?",
  options: [
    { key: "A", text: "The father's side" },
    { key: "B", text: "The mother's side" },
    { key: "C", text: "Both sides equally" },
    { key: "D", text: "The eldest child regardless of gender" }
  ],
  correct: "B",
  explanation: "In a matrilineal system, inheritance passes through the mother's lineage. This means a person belongs to the mother's clan and inherits from the maternal uncle. The Akan people of Ghana (including Ashanti, Fante, and Akyem) practise the matrilineal system. In contrast, the patrilineal system (practised by the Ewe, Ga, and northern groups) traces inheritance through the father.",
  hint: "The prefix 'matri-' comes from the Latin word for 'mother.'"
},
{
  id: "soc-54",
  topic: "Culture, Socialization & Family",
  question: "Which of the following is an example of a puberty rite practised in Ghana?",
  options: [
    { key: "A", text: "Hogbetsotso of the Anlo Ewe" },
    { key: "B", text: "Dipo of the Krobo" },
    { key: "C", text: "Homowo of the Ga" },
    { key: "D", text: "Kundum of the Nzema" }
  ],
  correct: "B",
  explanation: "Dipo is a puberty rite performed by the Krobo people of the Eastern Region to initiate young girls into womanhood. It involves rituals that teach the girls about adult responsibilities, hygiene, and moral conduct. Hogbetsotso, Homowo, and Kundum are festivals, not puberty rites.",
  hint: "This ceremony specifically marks the transition of young girls into adulthood among a people in the Eastern Region."
},
{
  id: "soc-55",
  topic: "Culture, Socialization & Family",
  question: "Which of the following best describes the clan system in Ghanaian traditional society?",
  options: [
    { key: "A", text: "A group of people who share the same political party" },
    { key: "B", text: "A group of people who live in the same region" },
    { key: "C", text: "A group of people believed to be descended from a common ancestor" },
    { key: "D", text: "A group of people who work in the same occupation" }
  ],
  correct: "C",
  explanation: "A clan is a group of people who trace their descent from a common ancestor, whether real or mythical. In Akan society, there are seven or eight main clans (abusua), and members of the same clan consider themselves related even if they come from different towns. Clan membership determines inheritance, marriage rules, and social obligations.",
  hint: "Clan membership is based on family lineage and shared ancestry, not where you live or what you do."
},
{
  id: "soc-56",
  topic: "Culture, Socialization & Family",
  question: "In Ghanaian culture, which of the following is a major purpose of funeral rites?",
  options: [
    { key: "A", text: "To punish the family of the deceased" },
    { key: "B", text: "To honour the deceased and give them a befitting send-off to the ancestral world" },
    { key: "C", text: "To elect a new chief for the community" },
    { key: "D", text: "To distribute land to community members" }
  ],
  correct: "B",
  explanation: "In Ghanaian culture, funeral rites are performed to honour the dead and ensure they are properly received by the ancestors in the spirit world. It is believed that a proper funeral ensures the deceased's peaceful transition and continued protection of the living family. Funerals also serve as occasions for family reunions and settling disputes.",
  hint: "Ghanaians believe the deceased must be properly sent off to join their forebears in the spirit world."
},
{
  id: "soc-57",
  topic: "Human Rights & Civic Responsibilities",
  question: "Chapter 5 of the 1992 Constitution of Ghana deals with which of the following?",
  options: [
    { key: "A", text: "The structure of the Armed Forces" },
    { key: "B", text: "Fundamental Human Rights and Freedoms" },
    { key: "C", text: "The powers of the Electoral Commission" },
    { key: "D", text: "The national anthem and pledge" }
  ],
  correct: "B",
  explanation: "Chapter 5 of the 1992 Constitution is devoted to Fundamental Human Rights and Freedoms. It guarantees rights such as the right to life, right to personal liberty, right to fair trial, freedom of speech, freedom of religion, and equality before the law. These rights protect every Ghanaian citizen.",
  hint: "This chapter protects the basic freedoms that every citizen is entitled to."
},
{
  id: "soc-58",
  topic: "Human Rights & Civic Responsibilities",
  question: "The Commission on Human Rights and Administrative Justice (CHRAJ) was established to do which of the following?",
  options: [
    { key: "A", text: "Collect taxes from citizens" },
    { key: "B", text: "Command the Ghana Armed Forces" },
    { key: "C", text: "Investigate complaints of human rights violations and administrative injustice" },
    { key: "D", text: "Conduct national elections" }
  ],
  correct: "C",
  explanation: "CHRAJ was established under the 1992 Constitution to investigate complaints of human rights abuses, administrative injustice, and corruption by public officials. It has the powers of a High Court and can summon any person for investigation. It serves as the national ombudsman and human rights institution.",
  hint: "This independent body acts like a watchdog protecting the rights of citizens against abuses."
},
{
  id: "soc-59",
  topic: "Human Rights & Civic Responsibilities",
  question: "Which of the following is a civic responsibility of a Ghanaian citizen?",
  options: [
    { key: "A", text: "Receiving free education from the government" },
    { key: "B", text: "Paying taxes honestly to the state" },
    { key: "C", text: "Travelling abroad freely" },
    { key: "D", text: "Receiving free healthcare at all hospitals" }
  ],
  correct: "B",
  explanation: "Paying taxes is a civic responsibility — a duty citizens owe to the state. Other civic responsibilities include obeying the law, defending the country, registering and voting, and protecting public property. Rights (like education and healthcare) are what the state owes to citizens, while responsibilities are what citizens owe to the state.",
  hint: "A responsibility is something you must do for your country, unlike a right which is something the country provides to you."
},
{
  id: "soc-60",
  topic: "Human Rights & Civic Responsibilities",
  question: "Under the 1992 Constitution, the rights of a citizen can be limited in which of the following situations?",
  options: [
    { key: "A", text: "When a citizen fails to vote in an election" },
    { key: "B", text: "When it is necessary to protect public order, public morality, or the rights of others" },
    { key: "C", text: "When the government disagrees with a citizen's opinion" },
    { key: "D", text: "When a citizen is below 30 years of age" }
  ],
  correct: "B",
  explanation: "The 1992 Constitution recognises that fundamental rights are not absolute. They may be lawfully restricted when necessary in the interest of defence, public safety, public health, public morality, or to protect the rights and freedoms of other persons. Such limitations must be reasonable and justifiable in a democratic society.",
  hint: "Rights can be limited only when there is a legitimate reason that balances individual freedom with the greater good."
},
{
  id: "soc-61",
  topic: "Socio-Economic Development",
  question: "Which of the following is a major pull factor for rural-urban migration in Ghana?",
  options: [
    { key: "A", text: "Inadequate rainfall in urban areas" },
    { key: "B", text: "Availability of social amenities and employment" },
    { key: "C", text: "Presence of large farmlands in cities" },
    { key: "D", text: "Low cost of living in urban centres" }
  ],
  correct: "B",
  explanation: "People migrate from rural to urban areas mainly because cities offer better employment opportunities, healthcare, education, and other social amenities that are lacking in rural communities.",
  hint: "Think about what attracts people to the cities."
},
{
  id: "soc-62",
  topic: "Socio-Economic Development",
  question: "Which of the following is an effect of rural-urban migration on the rural area?",
  options: [
    { key: "A", text: "Increased industrial growth" },
    { key: "B", text: "Shortage of labour for farming activities" },
    { key: "C", text: "Overcrowding in rural communities" },
    { key: "D", text: "Increased pollution levels" }
  ],
  correct: "B",
  explanation: "When young and able-bodied people leave rural areas for the cities, there is a shortage of labour for agricultural activities, which reduces food production in those communities.",
  hint: "Consider who usually migrates and what they leave behind."
},
{
  id: "soc-63",
  topic: "Socio-Economic Development",
  question: "One way to reduce rural-urban migration in Ghana is to",
  options: [
    { key: "A", text: "close down all rural schools" },
    { key: "B", text: "ban all forms of travel between regions" },
    { key: "C", text: "provide social amenities and industries in rural areas" },
    { key: "D", text: "increase taxes in urban centres" }
  ],
  correct: "C",
  explanation: "Providing social amenities such as hospitals, schools, pipe-borne water, and establishing industries in rural areas will create jobs and improve living standards, reducing the need for people to migrate to the cities.",
  hint: "What can make rural areas more attractive to live in?"
},
{
  id: "soc-64",
  topic: "Socio-Economic Development",
  question: "Which of the following is a problem associated with urbanization in Ghana?",
  options: [
    { key: "A", text: "Decrease in population" },
    { key: "B", text: "Development of slums and overcrowding" },
    { key: "C", text: "Reduction in vehicular traffic" },
    { key: "D", text: "Improved sanitation in all areas" }
  ],
  correct: "B",
  explanation: "Rapid urbanization in Ghana has led to the development of slums such as Old Fadama (Sodom and Gomorrah) in Accra, overcrowding, poor sanitation, and increased pressure on social amenities.",
  hint: "Think about what happens when too many people move to one place."
},
{
  id: "soc-65",
  topic: "Socio-Economic Development",
  question: "The One District, One Factory (1D1F) initiative was introduced to",
  options: [
    { key: "A", text: "promote importation of foreign goods" },
    { key: "B", text: "create employment and add value to local raw materials" },
    { key: "C", text: "reduce the number of districts in Ghana" },
    { key: "D", text: "replace all existing industries in the country" }
  ],
  correct: "B",
  explanation: "The One District, One Factory (1D1F) policy aims to establish at least one factory in each district to process local raw materials, create jobs, reduce rural-urban migration, and promote industrialization across Ghana.",
  hint: "The name of the policy gives a clue about decentralising industry."
},
{
  id: "soc-66",
  topic: "Socio-Economic Development",
  question: "The Free Senior High School (Free SHS) policy in Ghana was introduced in",
  options: [
    { key: "A", text: "2010" },
    { key: "B", text: "2015" },
    { key: "C", text: "2017" },
    { key: "D", text: "2020" }
  ],
  correct: "C",
  explanation: "The Free Senior High School (Free SHS) policy was introduced in September 2017 to remove financial barriers to secondary education and ensure that every Ghanaian child who qualifies can attend senior high school.",
  hint: "It was a major policy of the Akufo-Addo administration in its first year."
},
{
  id: "soc-67",
  topic: "Socio-Economic Development",
  question: "Which of the following best describes the informal sector of the Ghanaian economy?",
  options: [
    { key: "A", text: "Large-scale factories registered with the government" },
    { key: "B", text: "Small-scale, often unregistered businesses like hawking and artisanal work" },
    { key: "C", text: "Government ministries and departments" },
    { key: "D", text: "Multinational corporations operating in Ghana" }
  ],
  correct: "B",
  explanation: "The informal sector consists of small-scale, often unregistered economic activities such as petty trading, hawking, hairdressing, carpentry, and artisanal work. It employs a large percentage of Ghana's workforce.",
  hint: "Think of self-employed traders and artisans who may not pay formal taxes."
},
{
  id: "soc-68",
  topic: "Socio-Economic Development",
  question: "Which of the following is a cause of poverty in Ghana?",
  options: [
    { key: "A", text: "High literacy rate" },
    { key: "B", text: "Adequate social infrastructure" },
    { key: "C", text: "Unemployment and low level of education" },
    { key: "D", text: "Availability of natural resources" }
  ],
  correct: "C",
  explanation: "Unemployment and low levels of education are major causes of poverty in Ghana. Without education, people lack the skills needed for well-paying jobs, trapping them in a cycle of poverty.",
  hint: "Poverty is linked to a lack of opportunities."
},
{
  id: "soc-69",
  topic: "Agriculture & Food Security",
  question: "Crop rotation is the practice of",
  options: [
    { key: "A", text: "growing the same crop on the same piece of land every year" },
    { key: "B", text: "growing different crops on the same piece of land in a planned sequence" },
    { key: "C", text: "leaving the land to rest for several years" },
    { key: "D", text: "clearing and burning vegetation before planting" }
  ],
  correct: "B",
  explanation: "Crop rotation involves growing different types of crops on the same piece of land in successive seasons or years in a planned sequence. This helps maintain soil fertility and reduce pest and disease build-up.",
  hint: "The word 'rotation' suggests changing or alternating."
},
{
  id: "soc-70",
  topic: "Agriculture & Food Security",
  question: "Bush fallowing is a farming system in which",
  options: [
    { key: "A", text: "crops are grown under the shade of trees" },
    { key: "B", text: "a piece of land is cultivated and then left to rest to regain fertility" },
    { key: "C", text: "different crops are grown on the same plot at the same time" },
    { key: "D", text: "animals and crops are raised together on the same land" }
  ],
  correct: "B",
  explanation: "Bush fallowing involves cultivating a piece of land for a few years until it loses its fertility, then abandoning it for a period (fallow period) so the natural vegetation can regrow and restore the soil's nutrients.",
  hint: "'Fallow' means land left to rest without cultivation."
},
{
  id: "soc-71",
  topic: "Agriculture & Food Security",
  question: "Which of the following is a cash crop grown in Ghana?",
  options: [
    { key: "A", text: "Maize" },
    { key: "B", text: "Cassava" },
    { key: "C", text: "Cocoa" },
    { key: "D", text: "Plantain" }
  ],
  correct: "C",
  explanation: "Cocoa is Ghana's most important cash crop and a major source of foreign exchange. It is grown mainly for export and sale rather than for the farmer's own consumption. Maize, cassava, and plantain are food crops.",
  hint: "Ghana is the world's second-largest producer of this crop."
},
{
  id: "soc-72",
  topic: "Agriculture & Food Security",
  question: "The government agency responsible for the development of agriculture in Ghana is the",
  options: [
    { key: "A", text: "Ghana Education Service" },
    { key: "B", text: "Ministry of Food and Agriculture (MOFA)" },
    { key: "C", text: "Ghana Tourism Authority" },
    { key: "D", text: "Environmental Protection Agency" }
  ],
  correct: "B",
  explanation: "The Ministry of Food and Agriculture (MOFA) is responsible for developing and executing policies and strategies for the agricultural sector in Ghana. It promotes food security and provides extension services to farmers.",
  hint: "Its name directly relates to its function."
},
{
  id: "soc-73",
  topic: "Agriculture & Food Security",
  question: "Mixed farming involves",
  options: [
    { key: "A", text: "growing only one type of crop on a large scale" },
    { key: "B", text: "rearing animals and growing crops on the same farm" },
    { key: "C", text: "fishing and lumbering at the same time" },
    { key: "D", text: "growing crops in water" }
  ],
  correct: "B",
  explanation: "Mixed farming is a system where a farmer both grows crops and rears animals on the same piece of land. The animal droppings can serve as manure for the crops, and crop residues can feed the animals.",
  hint: "The word 'mixed' suggests combining two types of farming."
},
{
  id: "soc-74",
  topic: "Agriculture & Food Security",
  question: "Which of the following is a problem facing land tenure systems in Ghana?",
  options: [
    { key: "A", text: "Too much available land for farming" },
    { key: "B", text: "Litigation and disputes over land ownership" },
    { key: "C", text: "Land is too cheap to purchase" },
    { key: "D", text: "Government owns all the land in the country" }
  ],
  correct: "B",
  explanation: "Land tenure systems in Ghana face challenges including litigation (court cases) over ownership, multiple sales of the same land, insecurity of tenure for tenant farmers, and disputes between families and stools/skins over boundaries.",
  hint: "Think about conflicts that arise when different people claim the same land."
},
{
  id: "soc-75",
  topic: "Health & Sanitation",
  question: "The most effective way to prevent malaria is to",
  options: [
    { key: "A", text: "drink plenty of water" },
    { key: "B", text: "sleep under insecticide-treated mosquito nets" },
    { key: "C", text: "eat balanced meals regularly" },
    { key: "D", text: "exercise every morning" }
  ],
  correct: "B",
  explanation: "Sleeping under insecticide-treated mosquito nets (ITNs) is one of the most effective ways to prevent malaria, as it prevents mosquito bites during the night when Anopheles mosquitoes are most active.",
  hint: "Malaria is transmitted through mosquito bites, mostly at night."
},
{
  id: "soc-76",
  topic: "Health & Sanitation",
  question: "Cholera is mainly spread through",
  options: [
    { key: "A", text: "breathing polluted air" },
    { key: "B", text: "mosquito bites" },
    { key: "C", text: "contaminated water and food" },
    { key: "D", text: "sharing clothing with infected persons" }
  ],
  correct: "C",
  explanation: "Cholera is caused by the bacterium Vibrio cholerae and is mainly spread through drinking contaminated water or eating food that has been in contact with contaminated water. Proper sanitation and clean water prevent its spread.",
  hint: "This disease is common in areas with poor water and sanitation."
},
{
  id: "soc-77",
  topic: "Health & Sanitation",
  question: "The National Health Insurance Scheme (NHIS) in Ghana was established to",
  options: [
    { key: "A", text: "provide free housing for all citizens" },
    { key: "B", text: "provide affordable healthcare for all residents of Ghana" },
    { key: "C", text: "train doctors and nurses in the country" },
    { key: "D", text: "build new hospitals in every region" }
  ],
  correct: "B",
  explanation: "The National Health Insurance Scheme (NHIS), established by Act 650 of 2003 and later revised by Act 852 of 2012, was set up to provide affordable and accessible healthcare for all residents of Ghana, reducing the burden of out-of-pocket payments.",
  hint: "The word 'insurance' relates to covering costs."
},
{
  id: "soc-78",
  topic: "Health & Sanitation",
  question: "Which of the following is a proper sanitation practice?",
  options: [
    { key: "A", text: "Dumping refuse into gutters" },
    { key: "B", text: "Defecating in open spaces" },
    { key: "C", text: "Washing hands with soap after using the toilet" },
    { key: "D", text: "Burning waste in residential areas" }
  ],
  correct: "C",
  explanation: "Washing hands with soap after using the toilet is a proper sanitation and hygiene practice that helps prevent the spread of diseases like cholera, typhoid, and diarrhoea. The others are all unhygienic practices.",
  hint: "Good sanitation involves keeping yourself and your surroundings clean."
},
{
  id: "soc-79",
  topic: "Health & Sanitation",
  question: "The Guinea worm disease was largely eradicated in Ghana through",
  options: [
    { key: "A", text: "mass vaccination campaigns" },
    { key: "B", text: "provision of safe drinking water and health education" },
    { key: "C", text: "distribution of mosquito nets" },
    { key: "D", text: "use of antibiotics" }
  ],
  correct: "B",
  explanation: "Guinea worm disease (dracunculiasis) was eradicated in Ghana through provision of safe drinking water, use of water filters, treatment of water sources, and health education campaigns, since the disease is contracted by drinking contaminated water.",
  hint: "Guinea worm is contracted by drinking water containing water fleas carrying the larvae."
},
{
  id: "soc-80",
  topic: "Health & Sanitation",
  question: "HIV/AIDS can be transmitted through all the following EXCEPT",
  options: [
    { key: "A", text: "unprotected sexual intercourse" },
    { key: "B", text: "sharing of infected needles and sharps" },
    { key: "C", text: "shaking hands with an infected person" },
    { key: "D", text: "mother to child during pregnancy or breastfeeding" }
  ],
  correct: "C",
  explanation: "HIV/AIDS cannot be transmitted through casual contact like shaking hands, hugging, or sharing utensils. It is transmitted through unprotected sexual intercourse, sharing infected needles, blood transfusion, and from mother to child during pregnancy, delivery, or breastfeeding.",
  hint: "HIV is spread through body fluids, not casual physical contact."
},
{
  id: "soc-81",
  topic: "Tourism",
  question: "Cape Coast Castle and Elmina Castle are important tourist sites because they",
  options: [
    { key: "A", text: "are the tallest buildings in Ghana" },
    { key: "B", text: "serve as reminders of the history of the transatlantic slave trade" },
    { key: "C", text: "are the largest shopping centres in West Africa" },
    { key: "D", text: "were built by Ghanaians before independence" }
  ],
  correct: "B",
  explanation: "Cape Coast Castle and Elmina Castle are UNESCO World Heritage Sites that are significant because they served as slave dungeons during the transatlantic slave trade. They attract tourists from around the world, especially those of African descent tracing their history.",
  hint: "These castles are linked to a painful chapter in history involving forced labour."
},
{
  id: "soc-82",
  topic: "Tourism",
  question: "Kakum National Park in the Central Region of Ghana is famous for its",
  options: [
    { key: "A", text: "large waterfalls" },
    { key: "B", text: "canopy walkway through the tropical rainforest" },
    { key: "C", text: "ancient rock paintings" },
    { key: "D", text: "gold mining activities" }
  ],
  correct: "B",
  explanation: "Kakum National Park is famous for its unique canopy walkway, which is suspended about 30 metres above the ground in the tropical rainforest. It allows visitors to view wildlife and the forest from above, making it a major eco-tourism attraction.",
  hint: "You walk above the trees at this park."
},
{
  id: "soc-83",
  topic: "Tourism",
  question: "Mole National Park is located in the __(region)__ of Ghana and is known for its",
  options: [
    { key: "A", text: "Volta Region; marine life" },
    { key: "B", text: "Savannah Region; wildlife such as elephants and antelopes" },
    { key: "C", text: "Eastern Region; cocoa plantations" },
    { key: "D", text: "Ashanti Region; gold deposits" }
  ],
  correct: "B",
  explanation: "Mole National Park is Ghana's largest wildlife refuge, located in the Savannah Region (formerly Northern Region). It is home to elephants, antelopes, baboons, warthogs, and many bird species, making it a major safari destination.",
  hint: "It is Ghana's biggest game reserve in the northern part of the country."
},
{
  id: "soc-84",
  topic: "Tourism",
  question: "Wli Waterfalls, one of the highest waterfalls in West Africa, is found in the",
  options: [
    { key: "A", text: "Ashanti Region" },
    { key: "B", text: "Greater Accra Region" },
    { key: "C", text: "Volta Region" },
    { key: "D", text: "Western Region" }
  ],
  correct: "C",
  explanation: "Wli Waterfalls (also called Agumatsa Waterfalls) is located near the town of Wli in the Volta Region. It is one of the highest waterfalls in West Africa and a popular eco-tourism destination in Ghana.",
  hint: "This region is in the eastern part of Ghana, bordering Togo."
},
{
  id: "soc-85",
  topic: "Tourism",
  question: "Which of the following is a function of the Ghana Tourism Authority?",
  options: [
    { key: "A", text: "Building roads and bridges" },
    { key: "B", text: "Promoting and developing tourism in Ghana" },
    { key: "C", text: "Collecting taxes from farmers" },
    { key: "D", text: "Managing the country's armed forces" }
  ],
  correct: "B",
  explanation: "The Ghana Tourism Authority (GTA) is the government body responsible for promoting, developing, and regulating the tourism industry in Ghana. It markets Ghana's tourist attractions locally and internationally.",
  hint: "The name of the authority tells you its main function."
},
{
  id: "soc-86",
  topic: "International Cooperation",
  question: "ECOWAS was established in",
  options: [
    { key: "A", text: "1963" },
    { key: "B", text: "1975" },
    { key: "C", text: "1980" },
    { key: "D", text: "2001" }
  ],
  correct: "B",
  explanation: "The Economic Community of West African States (ECOWAS) was established on 28th May 1975 by the Treaty of Lagos. It was founded to promote economic integration, trade, and cooperation among West African countries.",
  hint: "It was founded in the mid-1970s in Lagos, Nigeria."
},
{
  id: "soc-87",
  topic: "International Cooperation",
  question: "One major objective of ECOWAS is to",
  options: [
    { key: "A", text: "promote free movement of people and goods among member states" },
    { key: "B", text: "establish a single religion for West Africa" },
    { key: "C", text: "make English the only official language in West Africa" },
    { key: "D", text: "abolish all forms of traditional governance" }
  ],
  correct: "A",
  explanation: "One of the key objectives of ECOWAS is to promote the free movement of persons, goods, services, and capital among its 15 member states. The ECOWAS passport and protocols facilitate this movement across borders.",
  hint: "Think about what an 'economic community' would focus on."
},
{
  id: "soc-88",
  topic: "International Cooperation",
  question: "The African Union (AU) replaced which organisation?",
  options: [
    { key: "A", text: "United Nations" },
    { key: "B", text: "Organisation of African Unity (OAU)" },
    { key: "C", text: "ECOWAS" },
    { key: "D", text: "Commonwealth of Nations" }
  ],
  correct: "B",
  explanation: "The African Union (AU) was established in 2002, replacing the Organisation of African Unity (OAU) which had been founded in 1963. The AU has a broader mandate including promoting peace, security, and development across the African continent.",
  hint: "The predecessor was also a continental African organisation."
},
{
  id: "soc-89",
  topic: "International Cooperation",
  question: "Which of the following is a specialised agency of the United Nations?",
  options: [
    { key: "A", text: "Ghana Police Service" },
    { key: "B", text: "World Health Organization (WHO)" },
    { key: "C", text: "National Commission for Civic Education" },
    { key: "D", text: "Ghana Bar Association" }
  ],
  correct: "B",
  explanation: "The World Health Organization (WHO) is a specialised agency of the United Nations responsible for international public health. Other UN agencies include UNICEF, UNESCO, FAO, and the ILO.",
  hint: "This organisation deals with health matters worldwide."
},
{
  id: "soc-90",
  topic: "International Cooperation",
  question: "Bilateral cooperation involves agreements between",
  options: [
    { key: "A", text: "a country and an international organisation" },
    { key: "B", text: "two countries" },
    { key: "C", text: "many countries" },
    { key: "D", text: "a country and a private company" }
  ],
  correct: "B",
  explanation: "Bilateral cooperation is an agreement or relationship between two countries. The prefix 'bi-' means two. For example, a trade agreement between Ghana and China is bilateral. Multilateral cooperation involves three or more countries.",
  hint: "The prefix 'bi-' gives a numerical clue."
},
{
  id: "soc-91",
  topic: "International Cooperation",
  question: "Ghana is a member of the Commonwealth of Nations because",
  options: [
    { key: "A", text: "it was colonised by France" },
    { key: "B", text: "it was formerly colonised by Britain" },
    { key: "C", text: "it is the largest country in Africa" },
    { key: "D", text: "it shares a border with Nigeria" }
  ],
  correct: "B",
  explanation: "The Commonwealth of Nations is a political association of mostly former territories of the British Empire. Ghana, as a former British colony (Gold Coast), joined the Commonwealth upon gaining independence in 1957.",
  hint: "The Commonwealth is linked to a shared colonial history."
},
{
  id: "soc-92",
  topic: "Peace & Conflict Resolution",
  question: "Which of the following is a cause of chieftaincy disputes in Ghana?",
  options: [
    { key: "A", text: "Too many qualified candidates for the throne" },
    { key: "B", text: "Disagreements over the rightful successor to a stool or skin" },
    { key: "C", text: "Lack of traditional rulers in the community" },
    { key: "D", text: "Excessive government interference in sports" }
  ],
  correct: "B",
  explanation: "Chieftaincy disputes in Ghana often arise from disagreements over which family, gate, or individual is the rightful successor to a stool (in the south) or skin (in the north). These disputes can lead to prolonged conflicts within communities.",
  hint: "Succession means who takes over from the previous chief."
},
{
  id: "soc-93",
  topic: "Peace & Conflict Resolution",
  question: "Alternative Dispute Resolution (ADR) methods include all of the following EXCEPT",
  options: [
    { key: "A", text: "Mediation" },
    { key: "B", text: "Negotiation" },
    { key: "C", text: "Armed confrontation" },
    { key: "D", text: "Arbitration" }
  ],
  correct: "C",
  explanation: "Alternative Dispute Resolution (ADR) refers to peaceful methods of settling disputes outside the formal court system. These include mediation, negotiation, arbitration, and reconciliation. Armed confrontation is a violent approach and is not an ADR method.",
  hint: "ADR methods are peaceful, not violent."
},
{
  id: "soc-94",
  topic: "Peace & Conflict Resolution",
  question: "The National Peace Council of Ghana was established to",
  options: [
    { key: "A", text: "train soldiers for war" },
    { key: "B", text: "facilitate and develop mechanisms for conflict prevention and resolution" },
    { key: "C", text: "organize national elections" },
    { key: "D", text: "promote tourism in conflict zones" }
  ],
  correct: "B",
  explanation: "The National Peace Council (NPC), established by Act 818 of 2011, was created to facilitate and develop mechanisms for conflict prevention, management, resolution, and to build sustainable peace in Ghana.",
  hint: "The word 'peace' in its name indicates its core function."
},
{
  id: "soc-95",
  topic: "Peace & Conflict Resolution",
  question: "The media can promote peace in society by",
  options: [
    { key: "A", text: "broadcasting hate speech and propaganda" },
    { key: "B", text: "reporting conflicts accurately and promoting dialogue" },
    { key: "C", text: "taking sides in political disputes" },
    { key: "D", text: "refusing to report on national issues" }
  ],
  correct: "B",
  explanation: "The media promotes peace by reporting events accurately and fairly, educating the public, promoting dialogue among conflicting parties, and avoiding sensationalism or hate speech that could escalate conflicts.",
  hint: "Responsible journalism builds understanding, not division."
},
{
  id: "soc-96",
  topic: "Peace & Conflict Resolution",
  question: "Land disputes in Ghana are commonly caused by",
  options: [
    { key: "A", text: "excessive rainfall in certain regions" },
    { key: "B", text: "multiple sale of the same piece of land and unclear boundaries" },
    { key: "C", text: "building too many schools on farmlands" },
    { key: "D", text: "the government giving free land to everyone" }
  ],
  correct: "B",
  explanation: "Land disputes in Ghana are commonly caused by multiple sales of the same land to different buyers, unclear land boundaries, encroachment, and competing claims of ownership between families, stools, skins, and individuals.",
  hint: "Think about what happens when more than one person claims the same plot."
},
{
  id: "soc-97",
  topic: "State Symbols & National Identity",
  question: "The national flag of Ghana was designed by",
  options: [
    { key: "A", text: "Kwame Nkrumah" },
    { key: "B", text: "Theodosia Okoh" },
    { key: "C", text: "Philip Gbeho" },
    { key: "D", text: "Amon Kotei" }
  ],
  correct: "B",
  explanation: "The national flag of Ghana was designed by Theodosia Okoh and was first flown on 6th March 1957 when Ghana gained independence. The flag has three horizontal stripes of red, gold, and green with a black star in the centre.",
  hint: "This designer shares a name with a famous Ghanaian female educator and artist."
},
{
  id: "soc-98",
  topic: "State Symbols & National Identity",
  question: "The Coat of Arms of Ghana was designed by",
  options: [
    { key: "A", text: "Theodosia Okoh" },
    { key: "B", text: "Philip Gbeho" },
    { key: "C", text: "Amon Kotei" },
    { key: "D", text: "J.B. Danquah" }
  ],
  correct: "C",
  explanation: "The Coat of Arms of Ghana was designed by Amon Kotei. It features a shield divided into four quarters by a green St. George's Cross, with a gold lion, a castle, a cocoa tree, a mine shaft, and two eagles supporting the shield.",
  hint: "This person is different from the flag designer and the anthem composer."
},
{
  id: "soc-99",
  topic: "State Symbols & National Identity",
  question: "The national anthem of Ghana, 'God Bless Our Homeland Ghana', was composed by",
  options: [
    { key: "A", text: "Ephraim Amu" },
    { key: "B", text: "Theodosia Okoh" },
    { key: "C", text: "Philip Gbeho" },
    { key: "D", text: "Amon Kotei" }
  ],
  correct: "C",
  explanation: "The national anthem of Ghana, 'God Bless Our Homeland Ghana', was composed by Philip Gbeho. It was first performed on 6th March 1957 at the ceremony marking Ghana's independence from British colonial rule.",
  hint: "He was a renowned Ghanaian musician and composer."
},
{
  id: "soc-100",
  topic: "State Symbols & National Identity",
  question: "The Black Star on the national flag of Ghana symbolises",
  options: [
    { key: "A", text: "the mineral wealth of Ghana" },
    { key: "B", text: "the blood shed by freedom fighters" },
    { key: "C", text: "the lodestar of African freedom and emancipation" },
    { key: "D", text: "the fertile farmlands of Ghana" }
  ],
  correct: "C",
  explanation: "The Black Star on Ghana's flag represents the lodestar (guiding star) of African freedom. Ghana was the first sub-Saharan African country to gain independence, and the Black Star symbolises its role in leading the liberation of Africa from colonial rule. Ghana is also known as the 'Black Star of Africa'.",
  hint: "Ghana is often called the 'Black Star of Africa' because of its pioneering role."
}
  ],
  arts: [
{ id:"art-1", topic:"Visual Arts: Elements of Design", question:"Which element of art describes the tactile or visual feel of a surface (rough, smooth, grainy)?", options:[{key:"A",text:"Value"},{key:"B",text:"Texture"},{key:"C",text:"Form"},{key:"D",text:"Space"}], correct:"B", explanation:"Texture is the element that appeals to the sense of touch (tactile) or sight (simulated/visual texture).", hint:"Whether sandpaper or silk, this describes how the surface feels." },
{ id:"art-2", topic:"Indigenous Ghanaian Art", question:"The traditional Ghanaian strip cloth woven on narrow looms in Bonwire and Kpetoe is:", options:[{key:"A",text:"Batakari"},{key:"B",text:"Kente"},{key:"C",text:"Adinkra"},{key:"D",text:"Tie and Dye"}], correct:"B", explanation:"Kente (Nwentoma) is handwoven on narrow treadle looms with symbolic colors and geometric motifs representing heritage and royalty.", hint:"The world-famous colorful woven cloth from Ashanti and Volta." },
{ id:"art-3", topic:"Performing Arts: Traditional Dance", question:"The Adowa dance of the Akan people is traditionally recognized by its:", options:[{key:"A",text:"Acrobatic somersaults"},{key:"B",text:"Foot stomping with heavy brass anklets"},{key:"C",text:"Graceful hand and foot gestures communicating symbolic messages"},{key:"D",text:"Fire-eating displays"}], correct:"C", explanation:"Adowa dancers communicate poetic emotions, condolences, and respect through subtle hand patterns in sync with drum rhythms.", hint:"Symbolic communication with gentle hand movements." },
{ id:"art-4", topic:"Colour Theory", question:"In pigment mixing, a secondary color is produced by combining:", options:[{key:"A",text:"Black and white"},{key:"B",text:"Equal portions of any two primary colors"},{key:"C",text:"Water with a single pigment"},{key:"D",text:"All secondary colors together"}], correct:"B", explanation:"Secondary colors (Orange, Green, Violet) result from mixing two primaries (Red+Yellow=Orange, Blue+Yellow=Green, Red+Blue=Violet).", hint:"Mix two first-stage (primary) colors." },
{ id:"art-5", topic:"Design & Lettering", question:"The adjustment of spacing between individual letter characters in typography is termed:", options:[{key:"A",text:"Kerning"},{key:"B",text:"Embossing"},{key:"C",text:"Etching"},{key:"D",text:"Stenciling"}], correct:"A", explanation:"Kerning adjusts spacing between consecutive letters to prevent awkward visual gaps.", hint:"A design term starting with 'K'." },
{ id:"art-6", topic:"Adinkra Symbols", question:"The Adinkra symbol 'Gye Nyame' expresses the belief in:", options:[{key:"A",text:"The supremacy and omnipotence of God"},{key:"B",text:"Humility and gentle living"},{key:"C",text:"Bravery in warfare"},{key:"D",text:"The importance of learning"}], correct:"A", explanation:"'Gye Nyame' translates to 'Except God' — acknowledging nothing exists without the will of the Almighty.", hint:"Translated directly as 'Except God'." },
{ id:"art-7", topic:"Pottery & Modeling", question:"Forming pottery vessels by joining rolled ropes of clay without a wheel is called:", options:[{key:"A",text:"Coiling method"},{key:"B",text:"Slip casting"},{key:"C",text:"Glass blowing"},{key:"D",text:"Carving"}], correct:"A", explanation:"The coiling technique uses ropes of clay laid sequentially and smoothed together by hand.", hint:"Think about rolling clay like snakes or coils." },
{ id:"art-8", topic:"Indigenous Instruments", question:"Which of the following is an idiophone instrument in Ghanaian music?", options:[{key:"A",text:"Atumpan (Talking drum)"},{key:"B",text:"Dawuro (Metal gong)"},{key:"C",text:"Atenteben (Bamboo flute)"},{key:"D",text:"Seprewa (Harp-lute)"}], correct:"B", explanation:"An idiophone produces sound by vibration of its entire body without strings or membranes (e.g., dawuro, castanets, shekere).", hint:"A solid resonant metal instrument struck with a rod." },
{ id:"art-9", topic:"Principles of Design", question:"Which principle ensures that components of an artwork work harmoniously to create completeness?", options:[{key:"A",text:"Unity / Harmony"},{key:"B",text:"Contrast"},{key:"C",text:"Disproportion"},{key:"D",text:"Isolation"}], correct:"A", explanation:"Unity brings all elements (color, line, shape, texture) together so the composition appears unified.", hint:"The opposite of disharmony." },
{ id:"art-10", topic:"Leatherwork & Crafts", question:"The process of treating raw animal hides to prevent rotting and make leather durable is:", options:[{key:"A",text:"Tanning"},{key:"B",text:"Weaving"},{key:"C",text:"Glazing"},{key:"D",text:"Annealing"}], correct:"A", explanation:"Tanning uses tannins from plants or chemical salts to transform putrescible hide into stable, pliable leather.", hint:"A term commonly used in the leather craft industry." },
{ id:"art-11", topic:"Printmaking Techniques", question:"In relief printing, the parts of the block that are NOT carved away will:", options:[{key:"A",text:"Remain blank on the paper"},{key:"B",text:"Receive ink and print on the paper"},{key:"C",text:"Be covered with wax"},{key:"D",text:"Absorb water to dilute the ink"}], correct:"B", explanation:"In relief printing (e.g., linocut, woodcut), the raised surfaces receive ink and transfer it to paper when pressed. The carved-away areas remain blank.", hint:"Think about a rubber stamp — what touches the paper?" },
{ id:"art-12", topic:"Basketry & Weaving", question:"The Bolgatanga basket from the Upper East Region of Ghana is primarily made from:", options:[{key:"A",text:"Raffia palm fibers"},{key:"B",text:"Straw from the veta vera grass (elephant grass)"},{key:"C",text:"Cotton thread"},{key:"D",text:"Bamboo strips"}], correct:"B", explanation:"The iconic 'Bolga basket' is handwoven using dried straw from the locally abundant elephant grass (veta vera).", hint:"A grass that grows abundantly in the savannah zone of northern Ghana." },
{ id:"art-13", topic:"Sculpture: Carving vs Modeling", question:"Sculpture created by removing material (like wood or stone) to reveal a form is called:", options:[{key:"A",text:"Modeling"},{key:"B",text:"Casting"},{key:"C",text:"Carving (subtractive method)"},{key:"D",text:"Assemblage"}], correct:"C", explanation:"Carving is a subtractive process — material is chipped, cut, or chiselled away. Modeling (e.g., with clay) is additive — material is built up.", hint:"You take away material to reveal the shape hiding inside the block." },
{ id:"art-14", topic:"Music: Solfa Notation", question:"In the tonic solfa system, the notes of the major scale in ascending order are:", options:[{key:"A",text:"Do Re Mi Fa Sol La Ti Do"},{key:"B",text:"A B C D E F G A"},{key:"C",text:"Sa Re Ga Ma Pa Dha Ni Sa"},{key:"D",text:"Ut Re Mi Fa Sol La Si Ut"}], correct:"A", explanation:"The tonic solfa system used in Ghanaian schools assigns syllables Do Re Mi Fa Sol La Ti to the seven degrees of the major scale.", hint:"The famous song from 'The Sound of Music' uses these syllables." },
{ id:"art-15", topic:"Stage Performance & Drama", question:"In a stage play, the person responsible for coordinating all artistic and technical aspects of a production is the:", options:[{key:"A",text:"Prompter"},{key:"B",text:"Director"},{key:"C",text:"Stage hand"},{key:"D",text:"Costume designer"}], correct:"B", explanation:"The Director is the creative leader who interprets the script, guides actors, and coordinates all departments (lighting, sound, set design, costumes) into a unified production.", hint:"This person tells actors how to perform their roles and has creative control." },
{ id:"art-16", topic:"Batik & Tie-Dye", question:"In the batik dyeing process, hot melted wax is applied to fabric in order to:", options:[{key:"A",text:"Make the fabric heavier and warmer"},{key:"B",text:"Resist dye penetration and create patterns"},{key:"C",text:"Permanently bleach the fabric white"},{key:"D",text:"Glue decorative beads to the cloth"}], correct:"B", explanation:"Wax acts as a resist — areas covered with wax do not absorb dye, creating patterns. The wax is later removed by boiling or ironing.", hint:"The wax prevents dye from reaching certain areas — creating the design." },
{ id:"art-17", topic:"Mosaic Art", question:"A mosaic artwork is created by arranging small pieces of coloured material (tesserae) on a surface using:", options:[{key:"A",text:"Needle and thread"},{key:"B",text:"Adhesive or cement"},{key:"C",text:"A potter's wheel"},{key:"D",text:"A printing press"}], correct:"B", explanation:"Mosaic involves embedding small cut pieces (glass, tile, stone — called tesserae) into adhesive or wet cement to form decorative images or patterns.", hint:"The small pieces need something to stick to the wall or surface." },
{ id:"art-18", topic:"Safety in the Art Workshop", question:"When using sharp cutting tools (knives, chisels) in the art workshop, the most important safety rule is to:", options:[{key:"A",text:"Always cut towards your body for better control"},{key:"B",text:"Work barefoot for comfort"},{key:"C",text:"Always cut away from your body and keep tools sharp"},{key:"D",text:"Share tools by tossing them to classmates"}], correct:"C", explanation:"Cutting away from the body prevents self-injury. Sharp tools are safer than dull ones because they require less force and are less likely to slip.", hint:"Direction of cutting matters — and a dull blade is more dangerous than a sharp one." },
{ id:"art-19", topic:"Ghana Festivals & Art Forms", question:"The Homowo festival of the Ga people features the traditional art of:", options:[{key:"A",text:"Kente weaving competitions"},{key:"B",text:"Sprinkling of kpokpoi (steamed corn meal) and drumming/dancing processions"},{key:"C",text:"Pottery exhibitions"},{key:"D",text:"Oil painting contests"}], correct:"B", explanation:"Homowo ('hooting at hunger') is marked by the sprinkling of kpokpoi as a ritual offering, accompanied by vigorous drumming and dancing through the streets of Accra.", hint:"The name means 'hooting at hunger' — and a special corn dish is central." },
{ id:"art-20", topic:"Calligraphy & Lettering Styles", question:"Block letters (also called sans-serif letters) are characterised by:", options:[{key:"A",text:"Decorative curly strokes at the end of each letter"},{key:"B",text:"Uniform stroke width with no decorative extensions (serifs)"},{key:"C",text:"Only lowercase forms"},{key:"D",text:"Handwriting joined together like cursive"}], correct:"B", explanation:"Block (sans-serif) letters have clean, uniform strokes without the small projecting lines (serifs) found on letters like Times New Roman.", hint:"'Sans' means 'without' in French — without what?" },
{
  id: "art-21",
  topic: "Elements of Design",
  question: "Which type of line suggests excitement and instability in a composition?",
  options: [
    { key: "A", text: "Horizontal line" },
    { key: "B", text: "Vertical line" },
    { key: "C", text: "Zigzag line" },
    { key: "D", text: "Curved line" }
  ],
  correct: "C",
  explanation: "Zigzag lines create a sense of excitement, confusion, and instability because they change direction sharply. Horizontal lines suggest calm, vertical lines suggest strength, and curved lines suggest grace.",
  hint: "Think about which line changes direction most abruptly."
},
{
  id: "art-22",
  topic: "Elements of Design",
  question: "What is the difference between shape and form in art?",
  options: [
    { key: "A", text: "Shape is 3D while form is 2D" },
    { key: "B", text: "Shape is 2D while form is 3D" },
    { key: "C", text: "Shape uses colour while form does not" },
    { key: "D", text: "There is no difference between them" }
  ],
  correct: "B",
  explanation: "In art, a shape is a flat, two-dimensional (2D) area enclosed by lines, such as a circle or square. A form is three-dimensional (3D) and has depth, like a sphere or cube.",
  hint: "One is flat on paper, the other you could hold in your hand."
},
{
  id: "art-23",
  topic: "Elements of Design",
  question: "Which element of design refers to the lightness or darkness of a colour?",
  options: [
    { key: "A", text: "Texture" },
    { key: "B", text: "Space" },
    { key: "C", text: "Value" },
    { key: "D", text: "Form" }
  ],
  correct: "C",
  explanation: "Value refers to the lightness or darkness of a colour or tone. It helps artists create depth, contrast, and the illusion of light in their work.",
  hint: "This element deals with how light or dark something appears."
},
{
  id: "art-24",
  topic: "Elements of Design",
  question: "Texture that can be felt by touching a surface is called __________ texture.",
  options: [
    { key: "A", text: "Visual" },
    { key: "B", text: "Implied" },
    { key: "C", text: "Simulated" },
    { key: "D", text: "Tactile" }
  ],
  correct: "D",
  explanation: "Tactile texture is the actual physical texture of a surface that can be felt by touch, such as the roughness of sandpaper or the smoothness of glass. Visual texture is only seen, not felt.",
  hint: "The word comes from the Latin 'tactilis' meaning 'able to be touched.'"
},
{
  id: "art-25",
  topic: "Elements of Design",
  question: "The area around and between objects in an artwork is called __________.",
  options: [
    { key: "A", text: "Positive space" },
    { key: "B", text: "Negative space" },
    { key: "C", text: "Form" },
    { key: "D", text: "Value" }
  ],
  correct: "B",
  explanation: "Negative space is the empty area surrounding and between the subjects of an artwork. Positive space is the area occupied by the main objects or subjects themselves.",
  hint: "It is the 'empty' space, not the space taken up by the object."
},
{
  id: "art-26",
  topic: "Principles of Design",
  question: "When both sides of a design are identical or mirror each other, it is called __________.",
  options: [
    { key: "A", text: "Asymmetrical balance" },
    { key: "B", text: "Radial balance" },
    { key: "C", text: "Symmetrical balance" },
    { key: "D", text: "Informal balance" }
  ],
  correct: "C",
  explanation: "Symmetrical balance (also called formal balance) occurs when both halves of a design are identical or mirror images of each other along a central axis. Asymmetrical balance uses different elements that still feel visually balanced.",
  hint: "Think of a butterfly's wings — they are the same on both sides."
},
{
  id: "art-27",
  topic: "Principles of Design",
  question: "Which principle of design refers to the repetition of visual elements to create a sense of movement?",
  options: [
    { key: "A", text: "Emphasis" },
    { key: "B", text: "Proportion" },
    { key: "C", text: "Rhythm" },
    { key: "D", text: "Unity" }
  ],
  correct: "C",
  explanation: "Rhythm in art is created by the repetition of elements such as lines, shapes, or colours to suggest movement and guide the viewer's eye across the artwork, similar to rhythm in music.",
  hint: "This principle shares its name with a musical concept."
},
{
  id: "art-28",
  topic: "Principles of Design",
  question: "The area of an artwork that draws the viewer's attention first is called the __________.",
  options: [
    { key: "A", text: "Background" },
    { key: "B", text: "Focal point" },
    { key: "C", text: "Negative space" },
    { key: "D", text: "Pattern" }
  ],
  correct: "B",
  explanation: "The focal point is the centre of interest or area of emphasis in an artwork that first attracts the viewer's attention. Artists use contrast, colour, size, or placement to create a focal point.",
  hint: "It is the first spot your eyes are drawn to in a picture."
},
{
  id: "art-29",
  topic: "Principles of Design",
  question: "Which principle of design involves the use of opposite elements such as light and dark or rough and smooth?",
  options: [
    { key: "A", text: "Harmony" },
    { key: "B", text: "Contrast" },
    { key: "C", text: "Proportion" },
    { key: "D", text: "Pattern" }
  ],
  correct: "B",
  explanation: "Contrast is the principle that places opposing elements side by side to highlight their differences and create visual interest. Examples include light vs dark, large vs small, or rough vs smooth.",
  hint: "This principle is about showing differences between elements."
},
{
  id: "art-30",
  topic: "Colour Theory",
  question: "Which of the following is a set of primary colours?",
  options: [
    { key: "A", text: "Red, green, purple" },
    { key: "B", text: "Red, yellow, blue" },
    { key: "C", text: "Orange, green, violet" },
    { key: "D", text: "Yellow, green, blue" }
  ],
  correct: "B",
  explanation: "The three primary colours are red, yellow, and blue. They are called primary because they cannot be made by mixing other colours together, but all other colours can be mixed from them.",
  hint: "These three colours cannot be created by mixing any other colours."
},
{
  id: "art-31",
  topic: "Colour Theory",
  question: "What colour is produced when red and yellow are mixed together?",
  options: [
    { key: "A", text: "Green" },
    { key: "B", text: "Purple" },
    { key: "C", text: "Orange" },
    { key: "D", text: "Brown" }
  ],
  correct: "C",
  explanation: "Mixing the primary colours red and yellow produces the secondary colour orange. The three secondary colours (orange, green, violet) are each made by mixing two primary colours.",
  hint: "Think of the colour of a popular citrus fruit."
},
{
  id: "art-32",
  topic: "Colour Theory",
  question: "Which of these is an example of a warm colour?",
  options: [
    { key: "A", text: "Blue" },
    { key: "B", text: "Green" },
    { key: "C", text: "Violet" },
    { key: "D", text: "Orange" }
  ],
  correct: "D",
  explanation: "Warm colours include red, orange, and yellow. They are associated with fire and sunlight and tend to advance in a composition. Cool colours (blue, green, violet) are associated with water and sky.",
  hint: "Think of the colours of fire and the sun."
},
{
  id: "art-33",
  topic: "Colour Theory",
  question: "What is a tint of a colour?",
  options: [
    { key: "A", text: "A colour mixed with black" },
    { key: "B", text: "A colour mixed with white" },
    { key: "C", text: "A colour mixed with grey" },
    { key: "D", text: "A colour mixed with its complement" }
  ],
  correct: "B",
  explanation: "A tint is created by adding white to a pure colour, making it lighter. For example, adding white to red creates pink. A shade is created by adding black to a colour to make it darker.",
  hint: "This process makes a colour lighter, not darker."
},
{
  id: "art-34",
  topic: "Colour Theory",
  question: "On the colour wheel, colours that are directly opposite each other are called __________.",
  options: [
    { key: "A", text: "Analogous colours" },
    { key: "B", text: "Complementary colours" },
    { key: "C", text: "Tertiary colours" },
    { key: "D", text: "Neutral colours" }
  ],
  correct: "B",
  explanation: "Complementary colours sit directly opposite each other on the colour wheel (e.g., red and green, blue and orange, yellow and violet). When placed together, they create strong contrast and make each other appear more vibrant.",
  hint: "These colour pairs 'complete' each other on the wheel."
},
{
  id: "art-35",
  topic: "Indigenous Ghanaian Art — Kente",
  question: "Kente cloth weaving among the Ashanti people originated from the town of __________.",
  options: [
    { key: "A", text: "Ntonso" },
    { key: "B", text: "Bonwire" },
    { key: "C", text: "Foumban" },
    { key: "D", text: "Kpando" }
  ],
  correct: "B",
  explanation: "Bonwire, a town near Kumasi in the Ashanti Region, is the traditional home of Ashanti Kente weaving. According to legend, two hunters learned the art of weaving by watching a spider spin its web.",
  hint: "This town is located near Kumasi in the Ashanti Region."
},
{
  id: "art-36",
  topic: "Indigenous Ghanaian Art — Kente",
  question: "What type of loom is traditionally used to weave Kente cloth?",
  options: [
    { key: "A", text: "Broad loom" },
    { key: "B", text: "Jacquard loom" },
    { key: "C", text: "Narrow strip loom" },
    { key: "D", text: "Backstrap loom" }
  ],
  correct: "C",
  explanation: "Kente is woven on a narrow strip loom, producing long, thin strips of cloth approximately 3–5 inches wide. These strips are then sewn together side by side to create a larger cloth.",
  hint: "The loom produces thin strips that must be sewn together."
},
{
  id: "art-37",
  topic: "Indigenous Ghanaian Art — Kente",
  question: "In Kente cloth symbolism, the colour gold represents __________.",
  options: [
    { key: "A", text: "Fertility and growth" },
    { key: "B", text: "Blood and sacrifice" },
    { key: "C", text: "Royalty and wealth" },
    { key: "D", text: "Purity and joy" }
  ],
  correct: "C",
  explanation: "In Kente colour symbolism, gold (yellow) represents royalty, wealth, and high status. Green represents fertility and growth, red represents blood and political sacrifice, and white represents purity and festive occasions.",
  hint: "Think about what precious metal this colour is named after."
},
{
  id: "art-38",
  topic: "Indigenous Ghanaian Art — Kente",
  question: "Which ethnic group is associated with Kente weaving from Kpetoe in the Volta Region?",
  options: [
    { key: "A", text: "Ga-Adangbe" },
    { key: "B", text: "Dagomba" },
    { key: "C", text: "Ewe" },
    { key: "D", text: "Fante" }
  ],
  correct: "C",
  explanation: "The Ewe people of the Volta Region, particularly from Kpetoe and Agortime, are known for their distinctive style of Kente weaving. Ewe Kente often features more figurative designs compared to the geometric patterns of Ashanti Kente.",
  hint: "This ethnic group is predominantly found in the Volta Region."
},
{
  id: "art-39",
  topic: "Indigenous Ghanaian Art — Kente",
  question: "In Kente symbolism, the colour red represents __________.",
  options: [
    { key: "A", text: "Purity and spirituality" },
    { key: "B", text: "Royalty and wealth" },
    { key: "C", text: "Blood and political sacrifice" },
    { key: "D", text: "Fertility and harvest" }
  ],
  correct: "C",
  explanation: "Red in Kente cloth symbolises bloodshed, political sacrifice, and strong political sentiments. It is also associated with death and mourning in some contexts in Ghanaian culture.",
  hint: "Think about the colour of the substance that flows through our veins."
},
{
  id: "art-40",
  topic: "Indigenous Ghanaian Art — Adinkra",
  question: "The Adinkra symbol 'Gye Nyame' represents __________.",
  options: [
    { key: "A", text: "Return and learn from the past" },
    { key: "B", text: "The supremacy of God" },
    { key: "C", text: "Strength and humility" },
    { key: "D", text: "Independence and freedom" }
  ],
  correct: "B",
  explanation: "Gye Nyame, meaning 'Except God,' is the most popular Adinkra symbol. It expresses the omnipotence and supremacy of God — the belief that nothing happens without God's permission.",
  hint: "The name translates to 'Except God' in Akan."
},
{
  id: "art-41",
  topic: "Indigenous Ghanaian Art — Adinkra",
  question: "Which Adinkra symbol means 'go back and get it' and represents the importance of learning from the past?",
  options: [
    { key: "A", text: "Dwennimmen" },
    { key: "B", text: "Adinkrahene" },
    { key: "C", text: "Sankofa" },
    { key: "D", text: "Fawohodie" }
  ],
  correct: "C",
  explanation: "Sankofa means 'go back and get it' in Akan. It is often depicted as a bird looking backward with an egg in its mouth, symbolising the importance of learning from the past to build the future.",
  hint: "This symbol is often shown as a bird turning its head backward."
},
{
  id: "art-42",
  topic: "Indigenous Ghanaian Art — Adinkra",
  question: "The traditional Adinkra stamping process uses dye made from the bark of the __________ tree.",
  options: [
    { key: "A", text: "Mahogany" },
    { key: "B", text: "Badie (Bridelia ferruginea)" },
    { key: "C", text: "Coconut palm" },
    { key: "D", text: "Shea" }
  ],
  correct: "B",
  explanation: "The dye for Adinkra stamping is prepared from the bark of the Badie tree (Bridelia ferruginea). The bark is boiled for hours to produce a thick, dark brown or black dye called 'adinkra aduro.'",
  hint: "The dye is called 'adinkra aduro' and comes from boiling tree bark."
},
{
  id: "art-43",
  topic: "Indigenous Ghanaian Art — Adinkra",
  question: "Which Adinkra symbol, depicted as two rams butting heads, represents strength with humility?",
  options: [
    { key: "A", text: "Aya" },
    { key: "B", text: "Nkyinkyim" },
    { key: "C", text: "Dwennimmen" },
    { key: "D", text: "Gye Nyame" }
  ],
  correct: "C",
  explanation: "Dwennimmen, meaning 'ram's horns,' symbolises strength combined with humility. Even the ram, which is known for its strength, fights by butting heads — showing that even the strong should be humble.",
  hint: "The name refers to a strong farm animal known for its horns."
},
{
  id: "art-44",
  topic: "Indigenous Ghanaian Art — Adinkra",
  question: "The village of Ntonso in the Ashanti Region is famous for producing __________.",
  options: [
    { key: "A", text: "Kente cloth" },
    { key: "B", text: "Adinkra cloth" },
    { key: "C", text: "Fugu smocks" },
    { key: "D", text: "Krobo beads" }
  ],
  correct: "B",
  explanation: "Ntonso, located in the Kwabre East District of the Ashanti Region, is the main centre for traditional Adinkra cloth production in Ghana. The stamps are carved from calabash gourd pieces.",
  hint: "This village is in the Ashanti Region and is linked to symbolic stamped cloth."
},
{
  id: "art-45",
  topic: "Pottery, Ceramics & Modeling",
  question: "Which pottery technique involves rolling clay into long ropes and stacking them to build a vessel?",
  options: [
    { key: "A", text: "Slab construction" },
    { key: "B", text: "Pinch method" },
    { key: "C", text: "Coiling" },
    { key: "D", text: "Throwing" }
  ],
  correct: "C",
  explanation: "Coiling is a hand-building technique where long ropes or coils of clay are stacked on top of each other and smoothed together to form the walls of a pot. It is one of the oldest pottery methods.",
  hint: "The name refers to the spiral shape the clay ropes form."
},
{
  id: "art-46",
  topic: "Pottery, Ceramics & Modeling",
  question: "What is the liquid mixture of clay and water used to join two pieces of clay together called?",
  options: [
    { key: "A", text: "Glaze" },
    { key: "B", text: "Engobe" },
    { key: "C", text: "Slip" },
    { key: "D", text: "Grog" }
  ],
  correct: "C",
  explanation: "Slip is a creamy mixture of clay and water used as an adhesive or 'glue' to join pieces of clay together. Before applying slip, the surfaces to be joined are scored (scratched) for better adhesion.",
  hint: "Think of a smooth, liquid version of clay used as glue."
},
{
  id: "art-47",
  topic: "Pottery, Ceramics & Modeling",
  question: "What is pottery that has been shaped but not yet fired called?",
  options: [
    { key: "A", text: "Bisqueware" },
    { key: "B", text: "Stoneware" },
    { key: "C", text: "Greenware" },
    { key: "D", text: "Earthenware" }
  ],
  correct: "C",
  explanation: "Greenware is clay that has been shaped but has not yet been fired in a kiln. It is very fragile and can still be returned to a workable state by adding water. After the first firing, it becomes bisqueware.",
  hint: "The name suggests the clay is still 'raw' or unfired."
},
{
  id: "art-48",
  topic: "Pottery, Ceramics & Modeling",
  question: "Which hand-building method involves pressing the thumb into a ball of clay to form a small pot?",
  options: [
    { key: "A", text: "Coiling" },
    { key: "B", text: "Slab construction" },
    { key: "C", text: "Pinch method" },
    { key: "D", text: "Wheel throwing" }
  ],
  correct: "C",
  explanation: "The pinch method involves holding a ball of clay in one hand and pressing the thumb of the other hand into the centre, then pinching and rotating to form a small pot. It is the simplest pottery technique.",
  hint: "The name describes the action your fingers make with the clay."
},
{
  id: "art-49",
  topic: "Pottery, Ceramics & Modeling",
  question: "The oven used for firing pottery at very high temperatures is called a __________.",
  options: [
    { key: "A", text: "Furnace" },
    { key: "B", text: "Kiln" },
    { key: "C", text: "Forge" },
    { key: "D", text: "Crucible" }
  ],
  correct: "B",
  explanation: "A kiln is a specially designed oven or furnace used to fire pottery and ceramics at very high temperatures (600°C–1400°C). Firing hardens the clay permanently and can melt glazes onto the surface.",
  hint: "This word rhymes with 'fill' and is specific to pottery."
},
{
  id: "art-50",
  topic: "Leatherwork & Beadwork",
  question: "The process of treating animal skin to turn it into leather is called __________.",
  options: [
    { key: "A", text: "Embossing" },
    { key: "B", text: "Tooling" },
    { key: "C", text: "Tanning" },
    { key: "D", text: "Burnishing" }
  ],
  correct: "C",
  explanation: "Tanning is the process of treating raw animal hides and skins to produce leather. The two main methods are vegetable tanning (using natural tannins from bark) and chrome tanning (using chromium salts).",
  hint: "This process shares its name with what happens to skin in the sun."
},
{
  id: "art-51",
  topic: "Leatherwork & Beadwork",
  question: "The Krobo people of Ghana are famous for making beads from __________.",
  options: [
    { key: "A", text: "Carved wood" },
    { key: "B", text: "Polished stone" },
    { key: "C", text: "Powder glass" },
    { key: "D", text: "Fired clay" }
  ],
  correct: "C",
  explanation: "The Krobo people of the Eastern Region are renowned for making powder glass beads. Recycled glass is crushed into fine powder, poured into clay moulds, and fired in a kiln to fuse the particles together.",
  hint: "Recycled glass bottles are crushed into fine particles to make these beads."
},
{
  id: "art-52",
  topic: "Leatherwork & Beadwork",
  question: "Which leather tool is used to make curved cuts and decorative designs on leather surfaces?",
  options: [
    { key: "A", text: "Edge beveller" },
    { key: "B", text: "Swivel knife" },
    { key: "C", text: "Stitching groover" },
    { key: "D", text: "Rivet setter" }
  ],
  correct: "B",
  explanation: "A swivel knife has a blade that rotates freely, allowing the craftsperson to make smooth, curved cuts and trace decorative patterns onto dampened leather. It is the primary tool for leather carving.",
  hint: "The name suggests the blade can turn or rotate freely."
},
{
  id: "art-53",
  topic: "Leatherwork & Beadwork",
  question: "Creating a raised design on leather by pressing or stamping from the reverse side is called __________.",
  options: [
    { key: "A", text: "Tooling" },
    { key: "B", text: "Embossing" },
    { key: "C", text: "Lacing" },
    { key: "D", text: "Skiving" }
  ],
  correct: "B",
  explanation: "Embossing is a technique where a raised design is created on leather by pressing or stamping from the back (reverse) side. Tooling involves cutting or stamping designs on the front surface.",
  hint: "The design appears raised or 'pushed out' from the surface."
},
{
  id: "art-54",
  topic: "Printmaking Techniques",
  question: "In relief printing, which part of the surface is inked to produce the print?",
  options: [
    { key: "A", text: "The cut-away areas" },
    { key: "B", text: "The raised surface" },
    { key: "C", text: "The grooves and channels" },
    { key: "D", text: "The entire block including cut areas" }
  ],
  correct: "B",
  explanation: "In relief printing (such as linocut and woodcut), the raised or uncut surface receives the ink. The cut-away areas remain ink-free and appear as white or blank areas on the finished print.",
  hint: "Think about what part of a rubber stamp touches the ink pad."
},
{
  id: "art-55",
  topic: "Printmaking Techniques",
  question: "Which printmaking technique uses a fine mesh screen stretched over a frame to transfer ink?",
  options: [
    { key: "A", text: "Woodcut" },
    { key: "B", text: "Etching" },
    { key: "C", text: "Screen printing" },
    { key: "D", text: "Lithography" }
  ],
  correct: "C",
  explanation: "Screen printing (also called silk screen or serigraphy) uses a mesh screen stretched over a frame. A stencil blocks certain areas, and ink is pushed through the open mesh onto the surface below using a squeegee.",
  hint: "This technique is also called silk screen or serigraphy."
},
{
  id: "art-56",
  topic: "Printmaking Techniques",
  question: "A linocut is an example of which type of printmaking?",
  options: [
    { key: "A", text: "Intaglio printing" },
    { key: "B", text: "Relief printing" },
    { key: "C", text: "Planographic printing" },
    { key: "D", text: "Digital printing" }
  ],
  correct: "B",
  explanation: "A linocut is a relief printing technique where the artist carves a design into a sheet of linoleum. The uncarved (raised) areas receive ink and are pressed onto paper to create the print.",
  hint: "The design is carved away, and the remaining raised surface is inked."
},
{
  id: "art-57",
  topic: "Printmaking Techniques",
  question: "In printmaking, the numbering '5/20' on a print means __________.",
  options: [
    { key: "A", text: "The print is 5 cm by 20 cm" },
    { key: "B", text: "It is the 5th print in an edition of 20" },
    { key: "C", text: "It was made using 5 colours out of 20" },
    { key: "D", text: "It took 5 out of 20 minutes to produce" }
  ],
  correct: "B",
  explanation: "Edition numbering in printmaking shows the individual print number and the total number of prints in the edition. '5/20' means this is the 5th print pulled from a total edition of 20 prints.",
  hint: "The first number is which print this is; the second is how many were made."
},
{
  id: "art-58",
  topic: "Basketry & Weaving",
  question: "The famous Bolga baskets from northern Ghana are woven primarily from __________.",
  options: [
    { key: "A", text: "Palm fronds" },
    { key: "B", text: "Elephant grass (veta vera)" },
    { key: "C", text: "Bamboo strips" },
    { key: "D", text: "Cotton yarn" }
  ],
  correct: "B",
  explanation: "Bolga baskets, named after Bolgatanga in the Upper East Region, are traditionally hand-woven from elephant grass (veta vera/straw). The grass is dyed in various colours before weaving to create colourful patterns.",
  hint: "This tall savannah grass is named after a large animal."
},
{
  id: "art-59",
  topic: "Basketry & Weaving",
  question: "Which basketry technique involves wrapping a binding material around a bundle of fibres in a spiral?",
  options: [
    { key: "A", text: "Stake-and-strand" },
    { key: "B", text: "Plaiting" },
    { key: "C", text: "Coil basketry" },
    { key: "D", text: "Twining" }
  ],
  correct: "C",
  explanation: "Coil basketry involves coiling a core material (such as grass or straw) into a spiral and stitching or wrapping each coil to the one below it with a binding material. Many Bolga baskets use this technique.",
  hint: "The name describes the spiral shape formed by the fibre bundles."
},
{
  id: "art-60",
  topic: "Basketry & Weaving",
  question: "Which of the following is a natural fibre commonly used in Ghanaian weaving and basketry?",
  options: [
    { key: "A", text: "Nylon" },
    { key: "B", text: "Polyester" },
    { key: "C", text: "Raffia" },
    { key: "D", text: "Acrylic" }
  ],
  correct: "C",
  explanation: "Raffia is a natural fibre obtained from the leaves of the raffia palm. It is widely used in Ghanaian weaving, basketry, and mat-making. The other options are all synthetic (man-made) fibres.",
  hint: "This natural fibre comes from the leaves of a type of palm tree."
},
{
  id: "art-61",
  topic: "Sculpture",
  question: "Which sculptural technique involves removing material from a block to create a form?",
  options: [
    { key: "A", text: "Modeling" },
    { key: "B", text: "Carving" },
    { key: "C", text: "Casting" },
    { key: "D", text: "Welding" }
  ],
  correct: "B",
  explanation: "Carving is a subtractive process where material such as wood or stone is cut away to reveal a form. Modeling, by contrast, is an additive process where material like clay is built up.",
  hint: "Think about whether material is added or taken away."
},
{
  id: "art-62",
  topic: "Sculpture",
  question: "Which of the following materials is commonly used for modeling in sculpture?",
  options: [
    { key: "A", text: "Granite" },
    { key: "B", text: "Mahogany" },
    { key: "C", text: "Clay" },
    { key: "D", text: "Marble" }
  ],
  correct: "C",
  explanation: "Clay is a soft, pliable material that is ideal for modeling (additive sculpture). Granite, mahogany, and marble are hard materials typically used for carving (subtractive sculpture).",
  hint: "Modeling requires a soft material you can shape with your hands."
},
{
  id: "art-63",
  topic: "Sculpture",
  question: "A sculpture that can be viewed from all sides is called __(?)__.",
  options: [
    { key: "A", text: "Relief sculpture" },
    { key: "B", text: "Sculpture in-the-round" },
    { key: "C", text: "Bas-relief" },
    { key: "D", text: "Assemblage" }
  ],
  correct: "B",
  explanation: "Sculpture in-the-round is a free-standing three-dimensional work that can be viewed from every angle. Relief sculpture is attached to a background and projects outward from it.",
  hint: "You can walk around this type of sculpture."
},
{
  id: "art-64",
  topic: "Sculpture",
  question: "Which tool is used by a sculptor to strike a chisel when carving wood?",
  options: [
    { key: "A", text: "Palette knife" },
    { key: "B", text: "Mallet" },
    { key: "C", text: "Spatula" },
    { key: "D", text: "Rolling pin" }
  ],
  correct: "B",
  explanation: "A mallet is a wooden or rubber-headed hammer used to strike chisels and gouges during the carving process. It drives the cutting tool into the material safely and with control.",
  hint: "This tool is like a special hammer for carving."
},
{
  id: "art-65",
  topic: "Sculpture",
  question: "A mobile is a type of sculpture that __(?)__.",
  options: [
    { key: "A", text: "Is carved from a single block of stone" },
    { key: "B", text: "Hangs and moves freely in the air" },
    { key: "C", text: "Is permanently fixed to a wall" },
    { key: "D", text: "Is made only from clay" }
  ],
  correct: "B",
  explanation: "A mobile is a kinetic sculpture made of balanced parts suspended so that they move freely when touched by air currents. It was popularised by the artist Alexander Calder.",
  hint: "Think of a hanging decoration that moves with the breeze."
},
{
  id: "art-66",
  topic: "Performing Arts — Music",
  question: "In solfa notation, what is the fifth note of the major scale?",
  options: [
    { key: "A", text: "Fa" },
    { key: "B", text: "La" },
    { key: "C", text: "Soh" },
    { key: "D", text: "Re" }
  ],
  correct: "C",
  explanation: "The solfa notes of the major scale in order are Doh, Re, Mi, Fa, Soh, La, Ti, Doh. Soh is the fifth note, also known as the dominant.",
  hint: "Count: Doh(1), Re(2), Mi(3), Fa(4), ?(5)."
},
{
  id: "art-67",
  topic: "Performing Arts — Music",
  question: "The atenteben is a traditional Ghanaian instrument that belongs to which family?",
  options: [
    { key: "A", text: "Idiophones" },
    { key: "B", text: "Membranophones" },
    { key: "C", text: "Chordophones" },
    { key: "D", text: "Aerophones" }
  ],
  correct: "D",
  explanation: "The atenteben is a bamboo flute from the Akan people of Ghana. It produces sound by blowing air through it, making it an aerophone — an instrument that produces sound through vibrating air.",
  hint: "You blow into this instrument to produce sound."
},
{
  id: "art-68",
  topic: "Performing Arts — Music",
  question: "A time signature of 3/4 means there are __(?)__.",
  options: [
    { key: "A", text: "Three crotchet beats in a bar" },
    { key: "B", text: "Four crotchet beats in a bar" },
    { key: "C", text: "Three minim beats in a bar" },
    { key: "D", text: "Two crotchet beats in a bar" }
  ],
  correct: "A",
  explanation: "In a 3/4 time signature, the top number (3) tells us there are three beats per bar, and the bottom number (4) tells us each beat is a crotchet (quarter note). This time signature is commonly used in waltzes.",
  hint: "The top number tells how many beats; the bottom number tells the type of note."
},
{
  id: "art-69",
  topic: "Performing Arts — Music",
  question: "The fontomfrom is a traditional Ghanaian drum associated with the __(?)__ people.",
  options: [
    { key: "A", text: "Ewe" },
    { key: "B", text: "Ga" },
    { key: "C", text: "Akan (Ashanti)" },
    { key: "D", text: "Dagomba" }
  ],
  correct: "C",
  explanation: "The fontomfrom is a large, barrel-shaped talking drum used by the Akan people, particularly the Ashanti. It is played during important ceremonies such as durbars and funerals of royalty.",
  hint: "This large talking drum is used in Ashanti royal ceremonies."
},
{
  id: "art-70",
  topic: "Performing Arts — Music",
  question: "Which family of instruments produces sound by striking, shaking or scraping without a stretched membrane?",
  options: [
    { key: "A", text: "Membranophones" },
    { key: "B", text: "Aerophones" },
    { key: "C", text: "Idiophones" },
    { key: "D", text: "Chordophones" }
  ],
  correct: "C",
  explanation: "Idiophones produce sound from the vibration of the entire body of the instrument when struck, shaken, or scraped. Examples include the dawuro (gong-gong), castanet, and axatse (shaker).",
  hint: "The instrument's own body vibrates — no skin or string needed."
},
{
  id: "art-71",
  topic: "Performing Arts — Music",
  question: "The seprewa is a traditional Ghanaian instrument classified as a __(?)__.",
  options: [
    { key: "A", text: "Membranophone" },
    { key: "B", text: "Idiophone" },
    { key: "C", text: "Chordophone" },
    { key: "D", text: "Aerophone" }
  ],
  correct: "C",
  explanation: "The seprewa (also spelled seperewa) is a traditional Akan harp-lute with strings that are plucked to produce sound. Instruments with vibrating strings are classified as chordophones.",
  hint: "This instrument has strings that you pluck."
},
{
  id: "art-72",
  topic: "Performing Arts — Dance & Drama",
  question: "The Adowa dance is traditionally associated with which ethnic group in Ghana?",
  options: [
    { key: "A", text: "Ewe" },
    { key: "B", text: "Ga-Adangbe" },
    { key: "C", text: "Akan (Ashanti)" },
    { key: "D", text: "Dagomba" }
  ],
  correct: "C",
  explanation: "Adowa is a graceful traditional dance of the Akan people, especially the Ashanti. It is performed at funerals, festivals, and social gatherings, and involves expressive hand movements that tell stories.",
  hint: "This dance is popular at Ashanti funerals and durbars."
},
{
  id: "art-73",
  topic: "Performing Arts — Dance & Drama",
  question: "Agbadza is a traditional dance originating from the __(?)__ people of Ghana.",
  options: [
    { key: "A", text: "Fante" },
    { key: "B", text: "Ewe" },
    { key: "C", text: "Dagomba" },
    { key: "D", text: "Ga" }
  ],
  correct: "B",
  explanation: "Agbadza is a popular social and recreational dance of the Ewe people of the Volta Region. It was originally a war dance but has evolved into a dance performed at social gatherings and festivals.",
  hint: "This dance comes from the Volta Region."
},
{
  id: "art-74",
  topic: "Performing Arts — Dance & Drama",
  question: "In stage terminology, the area of the stage closest to the audience is called __(?)__.",
  options: [
    { key: "A", text: "Upstage" },
    { key: "B", text: "Backstage" },
    { key: "C", text: "Wings" },
    { key: "D", text: "Downstage" }
  ],
  correct: "D",
  explanation: "Downstage refers to the front of the stage, closest to the audience. Upstage is the area farthest from the audience. The terms originated from raked (sloped) stages where the front was literally lower (down) than the back.",
  hint: "Think of the stage sloping down towards the audience."
},
{
  id: "art-75",
  topic: "Performing Arts — Dance & Drama",
  question: "The Bamaya dance originates from the __(?)__ people of Northern Ghana.",
  options: [
    { key: "A", text: "Akan" },
    { key: "B", text: "Ewe" },
    { key: "C", text: "Dagomba" },
    { key: "D", text: "Ga" }
  ],
  correct: "C",
  explanation: "Bamaya is a popular social dance of the Dagomba people of the Northern Region of Ghana. According to oral tradition, it originated from a period of drought when men dressed as women to seek rain from the gods.",
  hint: "This dance comes from the Northern Region and has a story about drought."
},
{
  id: "art-76",
  topic: "Performing Arts — Dance & Drama",
  question: "Which element of drama refers to the sequence of events in a play?",
  options: [
    { key: "A", text: "Theme" },
    { key: "B", text: "Dialogue" },
    { key: "C", text: "Plot" },
    { key: "D", text: "Conflict" }
  ],
  correct: "C",
  explanation: "The plot is the structured sequence of events or storyline in a play or drama. It includes the exposition, rising action, climax, falling action, and resolution (denouement).",
  hint: "This is the 'what happens' in the story from beginning to end."
},
{
  id: "art-77",
  topic: "Batik, Tie-Dye & Fabric Design",
  question: "In batik making, the crackle effect is achieved when __(?)__.",
  options: [
    { key: "A", text: "The fabric is folded before dyeing" },
    { key: "B", text: "The hardened wax cracks and dye seeps into the cracks" },
    { key: "C", text: "Thread is used to tie the fabric" },
    { key: "D", text: "Bleach is applied to the fabric" }
  ],
  correct: "B",
  explanation: "The crackle effect is a distinctive characteristic of batik. When the dried wax on the fabric is crumpled or crushed, it cracks and allows dye to penetrate through the fine lines, creating a veined pattern.",
  hint: "Think about what happens when dried wax breaks."
},
{
  id: "art-78",
  topic: "Batik, Tie-Dye & Fabric Design",
  question: "Which of the following is a resist technique used in tie-dye?",
  options: [
    { key: "A", text: "Applying hot wax with a tjanting tool" },
    { key: "B", text: "Tying, folding, or knotting the fabric before dyeing" },
    { key: "C", text: "Painting dye directly onto fabric" },
    { key: "D", text: "Screen printing with a stencil" }
  ],
  correct: "B",
  explanation: "In tie-dye, the resist is created by physically tying, folding, twisting, or knotting the fabric so that the dye cannot reach certain areas. This produces patterns when the ties are removed after dyeing.",
  hint: "The name of the technique tells you what is done to the fabric."
},
{
  id: "art-79",
  topic: "Batik, Tie-Dye & Fabric Design",
  question: "Hot wax is used in batik as a __(?)__ agent.",
  options: [
    { key: "A", text: "Bleaching" },
    { key: "B", text: "Colouring" },
    { key: "C", text: "Resist" },
    { key: "D", text: "Fixing" }
  ],
  correct: "C",
  explanation: "In batik, hot wax is applied to the fabric to resist (block) the dye from penetrating certain areas. When the fabric is dyed, the waxed areas remain uncoloured, creating the design.",
  hint: "The wax prevents the dye from reaching the fabric."
},
{
  id: "art-80",
  topic: "Batik, Tie-Dye & Fabric Design",
  question: "Which type of dye is derived from plants, bark, or roots?",
  options: [
    { key: "A", text: "Synthetic dye" },
    { key: "B", text: "Natural dye" },
    { key: "C", text: "Reactive dye" },
    { key: "D", text: "Acid dye" }
  ],
  correct: "B",
  explanation: "Natural dyes are obtained from natural sources such as plants (indigo, henna), bark, roots, berries, and insects. Synthetic dyes are manufactured chemically in factories.",
  hint: "These dyes come from living things found in nature."
},
{
  id: "art-81",
  topic: "Batik, Tie-Dye & Fabric Design",
  question: "Discharge dyeing involves __(?)__.",
  options: [
    { key: "A", text: "Adding more dye layers to fabric" },
    { key: "B", text: "Removing colour from already dyed fabric using a bleaching agent" },
    { key: "C", text: "Mixing two dyes together before application" },
    { key: "D", text: "Dipping fabric in cold water after dyeing" }
  ],
  correct: "B",
  explanation: "Discharge dyeing is a technique where a chemical agent (such as bleach or sodium hydrosulphite) is used to remove colour from specific areas of an already dyed fabric, creating a pattern by subtracting colour.",
  hint: "Think about removing or taking away colour rather than adding it."
},
{
  id: "art-82",
  topic: "Lettering, Typography & Calligraphy",
  question: "Which type of letter has small decorative strokes at the ends of its main strokes?",
  options: [
    { key: "A", text: "Sans-serif" },
    { key: "B", text: "Block letters" },
    { key: "C", text: "Serif" },
    { key: "D", text: "Gothic" }
  ],
  correct: "C",
  explanation: "Serif letters have small projecting lines or strokes (called serifs) at the ends of their main strokes. The word 'sans' means 'without,' so sans-serif letters do not have these decorative strokes.",
  hint: "'Serif' refers to the tiny feet or tails on the letters."
},
{
  id: "art-83",
  topic: "Lettering, Typography & Calligraphy",
  question: "In typography, the space between two specific letter characters is called __(?)__.",
  options: [
    { key: "A", text: "Leading" },
    { key: "B", text: "Tracking" },
    { key: "C", text: "Kerning" },
    { key: "D", text: "Indentation" }
  ],
  correct: "C",
  explanation: "Kerning is the adjustment of space between two specific letter characters to achieve a visually even appearance. Leading refers to the vertical space between lines of text.",
  hint: "This term deals with the gap between individual pairs of letters."
},
{
  id: "art-84",
  topic: "Lettering, Typography & Calligraphy",
  question: "Which of the following tools is most suitable for calligraphy?",
  options: [
    { key: "A", text: "Ballpoint pen" },
    { key: "B", text: "Broad-nib pen" },
    { key: "C", text: "Pencil eraser" },
    { key: "D", text: "Felt-tip marker" }
  ],
  correct: "B",
  explanation: "A broad-nib pen (also called a flat-nib or chisel-edge pen) is the traditional tool for calligraphy. Its flat tip creates thick and thin strokes depending on the direction of movement, giving calligraphy its characteristic beauty.",
  hint: "The flat edge of this pen creates both thick and thin strokes."
},
{
  id: "art-85",
  topic: "Lettering, Typography & Calligraphy",
  question: "Letters that slant to the right are described as __(?)__.",
  options: [
    { key: "A", text: "Roman" },
    { key: "B", text: "Bold" },
    { key: "C", text: "Italic" },
    { key: "D", text: "Condensed" }
  ],
  correct: "C",
  explanation: "Italic letters are characterised by a rightward slant. They were originally modelled on a flowing handwriting style developed in Italy during the Renaissance. Roman letters, by contrast, stand upright.",
  hint: "This style leans like the Tower of Pisa."
},
{
  id: "art-86",
  topic: "Mosaic Art",
  question: "The small individual pieces used to create a mosaic artwork are called __(?)__.",
  options: [
    { key: "A", text: "Tesserae" },
    { key: "B", text: "Palette" },
    { key: "C", text: "Pigments" },
    { key: "D", text: "Filaments" }
  ],
  correct: "A",
  explanation: "Tesserae (singular: tessera) are the small pieces of glass, tile, stone, shells, or other materials that are arranged to form a mosaic design. They are fixed onto a surface using adhesive or cement.",
  hint: "This Latin-derived term refers to the tiny tiles in a mosaic."
},
{
  id: "art-87",
  topic: "Mosaic Art",
  question: "In the direct method of mosaic making, the tesserae are __(?)__.",
  options: [
    { key: "A", text: "Placed face-down on paper and later transferred" },
    { key: "B", text: "Pressed directly into adhesive on the final surface" },
    { key: "C", text: "Glued onto a wooden frame first" },
    { key: "D", text: "Dipped in dye before placement" }
  ],
  correct: "B",
  explanation: "In the direct method, tesserae are placed directly onto the prepared surface with adhesive or wet cement. The artist can see the design as it develops. In the indirect method, tesserae are placed face-down on a temporary surface and later transferred.",
  hint: "The word 'direct' suggests placing pieces straight onto the surface."
},
{
  id: "art-88",
  topic: "Mosaic Art",
  question: "In mosaic art, grouting is done to __(?)__.",
  options: [
    { key: "A", text: "Colour the tesserae" },
    { key: "B", text: "Fill the gaps between tesserae and secure them" },
    { key: "C", text: "Remove unwanted tesserae" },
    { key: "D", text: "Polish the final artwork" }
  ],
  correct: "B",
  explanation: "Grouting involves applying a paste (grout) into the spaces between tesserae after they have been fixed. It fills the gaps, strengthens the mosaic, and gives it a finished, unified look.",
  hint: "Think about what fills the spaces between the small pieces."
},
{
  id: "art-89",
  topic: "Safety in the Art Workshop",
  question: "When using a cutting tool in the art workshop, you should always cut __(?)__.",
  options: [
    { key: "A", text: "Towards your body for better control" },
    { key: "B", text: "Away from your body" },
    { key: "C", text: "With both hands on the blade" },
    { key: "D", text: "Without looking at the material" }
  ],
  correct: "B",
  explanation: "Always cut away from your body to prevent injury in case the tool slips. This basic safety rule applies to knives, chisels, and all sharp cutting tools used in the art workshop.",
  hint: "If the tool slips, it should move away from you."
},
{
  id: "art-90",
  topic: "Safety in the Art Workshop",
  question: "Which of the following is NOT a personal protective equipment (PPE) item for the art workshop?",
  options: [
    { key: "A", text: "Apron" },
    { key: "B", text: "Safety goggles" },
    { key: "C", text: "Wristwatch" },
    { key: "D", text: "Gloves" }
  ],
  correct: "C",
  explanation: "A wristwatch is not PPE; in fact, jewellery and watches should be removed before working in the art workshop as they can get caught in tools or equipment. Aprons, goggles, and gloves are essential PPE items.",
  hint: "PPE items are designed to protect you from harm."
},
{
  id: "art-91",
  topic: "Safety in the Art Workshop",
  question: "Why is proper ventilation important when using chemical dyes and solvents in the art workshop?",
  options: [
    { key: "A", text: "To keep the room cool" },
    { key: "B", text: "To prevent the buildup of harmful fumes" },
    { key: "C", text: "To dry artwork faster" },
    { key: "D", text: "To reduce noise levels" }
  ],
  correct: "B",
  explanation: "Proper ventilation ensures that toxic fumes from chemicals, dyes, solvents, and adhesives are dispersed and do not accumulate to harmful levels. Inhaling these fumes can cause headaches, dizziness, and long-term health problems.",
  hint: "Chemical fumes can be dangerous if trapped in a closed room."
},
{
  id: "art-92",
  topic: "Safety in the Art Workshop",
  question: "Sharp tools in the art workshop should be stored __(?)__.",
  options: [
    { key: "A", text: "Loosely on the work table" },
    { key: "B", text: "In pockets for easy access" },
    { key: "C", text: "In designated racks or toolboxes with blades covered" },
    { key: "D", text: "On the floor near the workspace" }
  ],
  correct: "C",
  explanation: "Sharp tools like chisels, knives, and scissors should always be stored in proper racks, holders, or toolboxes with their blades covered or guarded. This prevents accidental cuts and injuries.",
  hint: "Organised storage with protected blades keeps everyone safe."
},
{
  id: "art-93",
  topic: "Ghana Festivals & Art Forms",
  question: "The Homowo festival is celebrated by the __(?)__ people of Ghana.",
  options: [
    { key: "A", text: "Ashanti" },
    { key: "B", text: "Ewe" },
    { key: "C", text: "Ga" },
    { key: "D", text: "Dagomba" }
  ],
  correct: "C",
  explanation: "Homowo, meaning 'hooting at hunger,' is an annual harvest festival of the Ga people of the Greater Accra Region. It commemorates a time of famine and the subsequent bumper harvest that ended it.",
  hint: "This festival is celebrated in the Greater Accra Region."
},
{
  id: "art-94",
  topic: "Ghana Festivals & Art Forms",
  question: "The Hogbetsotso festival commemorates the migration of the __(?)__ people.",
  options: [
    { key: "A", text: "Fante" },
    { key: "B", text: "Anlo Ewe" },
    { key: "C", text: "Ga" },
    { key: "D", text: "Akwapim" }
  ],
  correct: "B",
  explanation: "Hogbetsotso (meaning 'the festival of exodus') is celebrated by the Anlo Ewe people of the Volta Region. It commemorates their historic migration from Notsie in present-day Togo to their current homeland.",
  hint: "This festival celebrates a great journey from Notsie in Togo."
},
{
  id: "art-95",
  topic: "Ghana Festivals & Art Forms",
  question: "The Damba festival is celebrated by the __(?)__ people of Northern Ghana.",
  options: [
    { key: "A", text: "Ewe" },
    { key: "B", text: "Akan" },
    { key: "C", text: "Ga" },
    { key: "D", text: "Dagomba" }
  ],
  correct: "D",
  explanation: "The Damba festival is celebrated by the Dagomba people of the Northern Region to commemorate the birth of the Prophet Mohammed. It features colourful displays of horsemanship, drumming, and dancing.",
  hint: "This festival is associated with elaborate horse-riding displays in the north."
},
{
  id: "art-96",
  topic: "Ghana Festivals & Art Forms",
  question: "The Aboakyir (deer hunt) festival is celebrated by the people of __(?)__.",
  options: [
    { key: "A", text: "Elmina" },
    { key: "B", text: "Winneba (Efutu)" },
    { key: "C", text: "Cape Coast" },
    { key: "D", text: "Kumasi" }
  ],
  correct: "B",
  explanation: "Aboakyir is a unique festival of the Efutu people of Winneba in the Central Region. Two rival Asafo companies compete to catch a live deer and present it to the chief as a ritual sacrifice.",
  hint: "Two competing groups try to catch a deer alive in this Central Region town."
},
{
  id: "art-97",
  topic: "Ghana Festivals & Art Forms",
  question: "Which of the following art forms is commonly associated with Ghanaian festivals?",
  options: [
    { key: "A", text: "Oil painting on canvas" },
    { key: "B", text: "Drumming, dancing, and wearing of regalia" },
    { key: "C", text: "Watercolour landscape painting" },
    { key: "D", text: "Digital photography" }
  ],
  correct: "B",
  explanation: "Ghanaian festivals are rich in performing arts including drumming, dancing, singing, and the display of traditional regalia such as kente cloth, gold jewellery, and sandals. Body painting and face painting also feature in some festivals.",
  hint: "Traditional festivals showcase the living cultural arts of the people."
},
{
  id: "art-98",
  topic: "Design & Technology",
  question: "Which of the following describes functional design?",
  options: [
    { key: "A", text: "Design that focuses mainly on decoration and beauty" },
    { key: "B", text: "Design that ensures a product works well for its intended purpose" },
    { key: "C", text: "Design that uses only natural materials" },
    { key: "D", text: "Design that copies existing products exactly" }
  ],
  correct: "B",
  explanation: "Functional design prioritises how well a product performs its intended task. While aesthetic design focuses on appearance and beauty, functional design ensures the product is practical, efficient, and fit for purpose.",
  hint: "This type of design asks: 'Does it work well?'"
},
{
  id: "art-99",
  topic: "Design & Technology",
  question: "Ergonomics in product design is concerned with __(?)__.",
  options: [
    { key: "A", text: "Making products as cheap as possible" },
    { key: "B", text: "Designing products to fit the human body comfortably and safely" },
    { key: "C", text: "Using only recycled materials" },
    { key: "D", text: "Making products as colourful as possible" }
  ],
  correct: "B",
  explanation: "Ergonomics is the science of designing products, systems, and environments to fit the people who use them. It considers human body measurements, comfort, safety, and ease of use to reduce strain and injury.",
  hint: "Think about how a chair or tool is designed to fit your body."
},
{
  id: "art-100",
  topic: "Design & Technology",
  question: "The first step in the product design process is usually __(?)__.",
  options: [
    { key: "A", text: "Manufacturing the product" },
    { key: "B", text: "Identifying a need or problem" },
    { key: "C", text: "Selecting materials" },
    { key: "D", text: "Testing the final product" }
  ],
  correct: "B",
  explanation: "The design process begins with identifying a need or problem that requires a solution. This is followed by research, generating ideas, developing the best idea, making a prototype, testing, and evaluation.",
  hint: "Before you can solve a problem, you must first know what the problem is."
}
  ]
};

const sectionBDB = {
  integratedScience: [
    { id:'sb-sci-1', topic:'Photosynthesis', question:'(a) Explain photosynthesis. (b) State four conditions necessary for photosynthesis. (c) Give three reasons why photosynthesis is important.', marks:15, scheme:['(a) Photosynthesis — 3 marks:','• Green plants use light energy trapped by chlorophyll to make glucose from water and carbon dioxide.','• Oxygen is released.','','(b) Conditions — 4 marks:','• Light','• Chlorophyll','• Water','• Carbon dioxide','','(c) Importance — 6 marks:','• Produces food that supports food chains.','• Releases oxygen needed for aerobic respiration.','• Removes carbon dioxide from the atmosphere.'] },
    { id:'sb-sci-2', topic:'Human Body and Health', question:'(a) Name four organs of the human digestive system. (b) Explain one function of each. (c) State three practices that help keep the digestive system healthy.', marks:15, scheme:['(a) Organs — any four: mouth, oesophagus, stomach, small intestine, large intestine, rectum.','(b) Functions: mouth chews food; oesophagus moves food by peristalsis; stomach churns food; small intestine absorbs nutrients; large intestine absorbs water.','(c) Healthy practices: eat a balanced diet, drink safe water, wash hands, maintain food hygiene and exercise.'] },
    { id:'sb-sci-3', topic:'Forces and Motion', question:'(a) Define force. (b) State three effects of a force. (c) A cyclist travels 36 km in 2 hours. Calculate the average speed.', marks:10, scheme:['(a) A force is a push or pull.','(b) A force can start or stop motion, change speed or direction, and change an object’s shape.','(c) Speed = distance ÷ time = 36 km ÷ 2 h = 18 km/h.'] }
  ],

  social: [
    { id:"sb-soc-1", topic:"Environment", question:"Describe four (4) human activities that lead to the degradation of the environment in Ghana. Suggest two (2) ways each of these can be controlled.", marks:20,
      scheme: [
        "Human activities (1 mark each for identification, 1 mark for description — max 4 activities × 2 = 8 marks):",
        "• Illegal mining (galamsey) — strips topsoil, pollutes rivers with mercury",
        "• Deforestation / Illegal logging — destroys habitat, reduces rainfall",
        "• Bush burning — destroys soil organisms, causes erosion",
        "• Improper waste disposal — chokes drains, pollutes water bodies",
        "• Overgrazing — leads to desertification in savanna areas",
        "",
        "Control measures (1 mark each — max 8 marks):",
        "• Illegal mining: enforce mining regulations; reclaim damaged land and restore vegetation.",
        "• Deforestation: enforce controls on illegal logging; replant trees and manage forests sustainably.",
        "• Bush burning: educate farmers about safer land preparation; establish and maintain fire belts.",
        "• Poor waste disposal: provide reliable waste collection; enforce sanitation bylaws and support recycling.",
        "• If using overgrazing instead: rotate grazing areas; match livestock numbers to available pasture.",
        "",
        "Organisation and clarity: 4 marks",
        "Total: 20 marks"
      ]
    },
    { id:"sb-soc-2", topic:"Governance", question:"Explain four (4) functions of the Electoral Commission of Ghana.", marks:10,
      scheme: [
        "Any 4 correct functions (2.5 marks each = 10 marks):",
        "• Compiling the voters' register and revising it periodically",
        "• Conducting and supervising all public elections and referenda",
        "• Demarcating electoral boundaries / constituencies",
        "• Educating the public on the electoral process",
        "• Registering political parties and monitoring their activities",
        "• Declaring election results"
      ]
    },
    { id:"sb-soc-3", topic:"Culture", question:"Explain four (4) ways in which culture promotes national unity in Ghana.", marks:10,
      scheme: [
        "Any 4 valid points (2.5 marks each = 10 marks):",
        "• National festivals (e.g., PANAFEST, CHALE WOTE) bring diverse ethnic groups together",
        "• Common national symbols (flag, anthem, coat of arms) foster shared identity",
        "• Inter-ethnic marriages promote understanding and tolerance",
        "• National language policies (English as lingua franca) enable communication",
        "• Shared cultural values (respect for elders, communal living) cut across ethnic lines",
        "• National dress days promote appreciation of diverse textiles (Kente, Smock, etc.)"
      ]
    }
  ],
  arts: [
    { id:"sb-art-1", topic:"Colour Theory", question:"(a) Define primary colours. (b) Name the three primary colours. (c) Explain how secondary and tertiary colours are obtained. (d) Draw a simple colour wheel showing primary, secondary, and tertiary colours.", marks:15,
      scheme: [
        "(a) Definition — 2 marks:",
        "Primary colours are the basic colours that cannot be produced by mixing other colours together.",
        "",
        "(b) Naming — 3 marks (1 mark each):",
        "Red, Yellow, Blue",
        "",
        "(c) Explanation — 6 marks:",
        "Secondary colours (2 marks): formed by mixing two primary colours in equal proportions:",
        "• Red + Yellow = Orange",
        "• Blue + Yellow = Green",
        "• Red + Blue = Violet/Purple",
        "Tertiary colours (2 marks): formed by mixing a primary colour with an adjacent secondary colour:",
        "• e.g., Red + Orange = Red-Orange, Yellow + Green = Yellow-Green, etc.",
        "Clarity of explanation: 2 marks",
        "",
        "(d) Colour wheel diagram — 4 marks:",
        "Correct placement of 3 primaries, 3 secondaries, 6 tertiaries in circular arrangement"
      ]
    },
    { id:"sb-art-2", topic:"Adinkra Symbols", question:"(a) What are Adinkra symbols? (b) Name four Adinkra symbols and explain what each represents. (c) State two uses of Adinkra symbols in modern Ghana.", marks:15,
      scheme: [
        "(a) Definition — 2 marks:",
        "Adinkra symbols are visual symbols created by the Akan people of Ghana that represent proverbs, concepts, historical events, or philosophical ideas.",
        "",
        "(b) Four symbols and meanings — 8 marks (2 marks each):",
        "• Gye Nyame — 'Except God' / supremacy of God",
        "• Sankofa — 'Go back and get it' / learning from the past",
        "• Dwennimmen — Ram's horns / humility with strength",
        "• Adinkrahene — Chief of Adinkra / greatness, leadership",
        "• Aya — Fern / endurance, resourcefulness",
        "• Fawohodie — Independence / freedom",
        "(Accept any valid symbols with correct meanings)",
        "",
        "(c) Modern uses — 4 marks (2 marks each):",
        "• Printed on fabrics and clothing (fashion)",
        "• Used in architecture and interior decoration",
        "• Used in corporate logos and branding",
        "• Featured on educational materials and national ceremonies",
        "• Tattooed or used in jewellery design"
      ]
    },
    { id:"sb-art-3", topic:"Safety in the Workshop", question:"State and explain five (5) safety rules that must be observed in the art studio or workshop.", marks:10,
      scheme: [
        "Any 5 valid rules (2 marks each = 10 marks — 1 mark for stating, 1 mark for explanation):",
        "• Always cut away from the body — prevents accidental self-injury from slipping tools",
        "• Wear protective gear (aprons, gloves, goggles) — protects skin and eyes from chemicals/sharp fragments",
        "• Keep the workshop clean and tidy — prevents tripping and accidents from scattered tools",
        "• Store sharp tools properly after use — prevents injuries when reaching into drawers/shelves",
        "• Never run or play in the workshop — reduces risk of collisions and falls",
        "• Use chemicals (paints, glues, dyes) in well-ventilated areas — prevents inhalation of toxic fumes",
        "• Report damaged equipment to the teacher — prevents use of faulty tools that may cause injury",
        "• Follow teacher instructions carefully — ensures proper technique and safe handling"
      ]
    }
  ]
};

sectionBDB.french = [
  { id:'sb-fre-1', topic:'Me présenter (Introduce myself)', question:'Write five short French sentences to greet someone and introduce yourself. Include your name, age, school role and town. You may use the sentence starters in the guide.', marks:10, scheme:['Bonjour ! — 2 marks','Je m’appelle … — My name is … (2 marks)','J’ai … ans. — I am … years old (replace the number with your age) (2 marks)','Je suis élève. — I am a pupil (2 marks)','J’habite à … — I live in … (2 marks)','Accept other simple, correct beginner sentences.'] },
  { id:'sb-fre-2', topic:'À l’école (At school)', question:'Translate these five easy words into French: school, book, pen, pupil and teacher. Then write one short sentence using “un livre”.', marks:10, scheme:['école = school — 2 marks','livre = book — 2 marks','stylo = pen — 2 marks','élève = pupil — 2 marks','professeur = teacher — 1 mark','Un livre = a book — 1 mark'] },
  { id:'sb-fre-3', topic:'Petit dialogue (A short conversation)', question:'Complete a short conversation in French. Greet your friend, ask their name, tell them your name and say goodbye.', marks:10, scheme:['Bonjour ! / Salut ! — greeting (2 marks)','Comment tu t’appelles ? — What is your name? (2 marks)','Je m’appelle … — My name is … (2 marks)','Enchanté(e) ! — Nice to meet you. (2 marks)','Au revoir ! — Goodbye! (2 marks)','Accept other suitable beginner-level greetings and responses.'] }
];

questionsDB.integratedScience = [{"id":"sci-1","topic":"Life Processes","question":"Which process enables green plants to make glucose using light energy?","options":[{"key":"A","text":"Respiration"},{"key":"B","text":"Photosynthesis"},{"key":"C","text":"Transpiration"},{"key":"D","text":"Germination"}],"correct":"B","explanation":"Photosynthesis uses light energy, water and carbon dioxide to make glucose; oxygen is released.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-2","topic":"Life Processes","question":"Which plant structure absorbs most water from the soil?","options":[{"key":"A","text":"Flower"},{"key":"B","text":"Root hairs"},{"key":"C","text":"Fruit"},{"key":"D","text":"Stem"}],"correct":"B","explanation":"Root hairs provide a large surface area for absorbing water and mineral salts.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-3","topic":"Life Processes","question":"Which organism is a producer in a food chain?","options":[{"key":"A","text":"Grass"},{"key":"B","text":"Grasshopper"},{"key":"C","text":"Lizard"},{"key":"D","text":"Hawk"}],"correct":"A","explanation":"Green plants make their own food and are producers.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-4","topic":"Human Body and Health","question":"Which organ pumps blood around the human body?","options":[{"key":"A","text":"Lungs"},{"key":"B","text":"Heart"},{"key":"C","text":"Kidney"},{"key":"D","text":"Liver"}],"correct":"B","explanation":"The heart pumps blood through the circulatory system.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-5","topic":"Human Body and Health","question":"Where does most absorption of digested food take place?","options":[{"key":"A","text":"Mouth"},{"key":"B","text":"Stomach"},{"key":"C","text":"Small intestine"},{"key":"D","text":"Large intestine"}],"correct":"C","explanation":"The small intestine absorbs nutrients through its villi.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-6","topic":"Human Body and Health","question":"Which nutrient is mainly needed for growth and repair of body tissues?","options":[{"key":"A","text":"Proteins"},{"key":"B","text":"Fats"},{"key":"C","text":"Vitamins"},{"key":"D","text":"Water"}],"correct":"A","explanation":"Proteins provide amino acids for growth and tissue repair.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-7","topic":"Matter and Materials","question":"Which change of state changes liquid water into water vapour?","options":[{"key":"A","text":"Freezing"},{"key":"B","text":"Condensation"},{"key":"C","text":"Evaporation"},{"key":"D","text":"Melting"}],"correct":"C","explanation":"Evaporation changes a liquid into a gas.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-8","topic":"Matter and Materials","question":"Which of these is a mixture?","options":[{"key":"A","text":"Pure water"},{"key":"B","text":"Oxygen"},{"key":"C","text":"Common salt"},{"key":"D","text":"Air"}],"correct":"D","explanation":"Air is a mixture of gases, mainly nitrogen and oxygen.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-9","topic":"Matter and Materials","question":"What is the best method for separating sand from water?","options":[{"key":"A","text":"Filtration"},{"key":"B","text":"Evaporation"},{"key":"C","text":"Magnetism"},{"key":"D","text":"Distillation"}],"correct":"A","explanation":"Filtration traps insoluble sand while water passes through.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-10","topic":"Matter and Materials","question":"A substance that turns blue litmus paper red is","options":[{"key":"A","text":"an acid"},{"key":"B","text":"an alkali"},{"key":"C","text":"neutral"},{"key":"D","text":"a metal"}],"correct":"A","explanation":"Acids turn blue litmus red; alkalis turn red litmus blue.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-11","topic":"Energy","question":"What is the main source of energy for Earth?","options":[{"key":"A","text":"The Moon"},{"key":"B","text":"The Sun"},{"key":"C","text":"The oceans"},{"key":"D","text":"The soil"}],"correct":"B","explanation":"The Sun supplies light and heat and drives many natural processes.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-12","topic":"Energy","question":"Which simple machine is a seesaw?","options":[{"key":"A","text":"Pulley"},{"key":"B","text":"Wheel and axle"},{"key":"C","text":"Lever"},{"key":"D","text":"Inclined plane"}],"correct":"C","explanation":"A seesaw is a lever that turns around a fulcrum.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-13","topic":"Energy","question":"Which form of energy is stored in a stretched elastic band?","options":[{"key":"A","text":"Chemical"},{"key":"B","text":"Elastic potential"},{"key":"C","text":"Sound"},{"key":"D","text":"Light"}],"correct":"B","explanation":"A stretched elastic band stores elastic potential energy.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-14","topic":"Energy","question":"Which material is a good electrical conductor?","options":[{"key":"A","text":"Rubber"},{"key":"B","text":"Dry wood"},{"key":"C","text":"Copper"},{"key":"D","text":"Plastic"}],"correct":"C","explanation":"Copper allows electric charge to flow easily.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-15","topic":"Forces and Motion","question":"What is the SI unit of force?","options":[{"key":"A","text":"Joule"},{"key":"B","text":"Watt"},{"key":"C","text":"Newton"},{"key":"D","text":"Metre"}],"correct":"C","explanation":"Force is measured in newtons (N).","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-16","topic":"Forces and Motion","question":"Friction generally","options":[{"key":"A","text":"opposes motion between surfaces"},{"key":"B","text":"always increases speed"},{"key":"C","text":"acts only in water"},{"key":"D","text":"has no effect"}],"correct":"A","explanation":"Friction acts against relative motion between surfaces.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-17","topic":"Forces and Motion","question":"A car travels 120 km in 2 hours. What is its average speed?","options":[{"key":"A","text":"30 km/h"},{"key":"B","text":"60 km/h"},{"key":"C","text":"120 km/h"},{"key":"D","text":"240 km/h"}],"correct":"B","explanation":"Average speed = distance ÷ time = 120 ÷ 2 = 60 km/h.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-18","topic":"Earth and Space","question":"What causes day and night?","options":[{"key":"A","text":"Earth's revolution"},{"key":"B","text":"The Moon's rotation"},{"key":"C","text":"Earth's rotation on its axis"},{"key":"D","text":"Cloud movement"}],"correct":"C","explanation":"Earth rotates on its axis; the side facing the Sun experiences day.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-19","topic":"Earth and Space","question":"Which is the outermost solid layer of Earth?","options":[{"key":"A","text":"Inner core"},{"key":"B","text":"Outer core"},{"key":"C","text":"Mantle"},{"key":"D","text":"Crust"}],"correct":"D","explanation":"The crust is Earth's thin outermost solid layer.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-20","topic":"Earth and Space","question":"Rainfall, temperature and wind are elements of","options":[{"key":"A","text":"weather"},{"key":"B","text":"soil fertility"},{"key":"C","text":"the water table"},{"key":"D","text":"animal migration"}],"correct":"A","explanation":"Weather describes atmospheric conditions over a short period.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-21","topic":"Agriculture","question":"Which soil type usually holds the most water?","options":[{"key":"A","text":"Sandy soil"},{"key":"B","text":"Clayey soil"},{"key":"C","text":"Gravel"},{"key":"D","text":"Loamy sand"}],"correct":"B","explanation":"Clay has tiny particles and generally retains more water.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-22","topic":"Agriculture","question":"Why are legumes useful in crop rotation?","options":[{"key":"A","text":"They remove all water"},{"key":"B","text":"They help add nitrogen to soil"},{"key":"C","text":"They stop all weeds"},{"key":"D","text":"They make soil rocky"}],"correct":"B","explanation":"Root-nodule bacteria in many legumes fix atmospheric nitrogen.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-23","topic":"Environment","question":"Which material is biodegradable?","options":[{"key":"A","text":"Plastic bottle"},{"key":"B","text":"Glass jar"},{"key":"C","text":"Banana peel"},{"key":"D","text":"Aluminium can"}],"correct":"C","explanation":"Microorganisms can break down a banana peel.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-24","topic":"Environment","question":"Which action helps reduce soil erosion?","options":[{"key":"A","text":"Removing vegetation"},{"key":"B","text":"Planting cover crops"},{"key":"C","text":"Burning grass"},{"key":"D","text":"Leaving soil bare"}],"correct":"B","explanation":"Cover crops protect soil and their roots hold soil particles.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-25","topic":"Scientific Skills","question":"Which instrument measures the temperature of a liquid?","options":[{"key":"A","text":"Metre rule"},{"key":"B","text":"Thermometer"},{"key":"C","text":"Stopwatch"},{"key":"D","text":"Measuring cylinder"}],"correct":"B","explanation":"A thermometer measures temperature.","hint":"Identify the scientific idea being tested, then compare the options."},{"id":"sci-26","topic":"Scientific Skills","question":"Why should an experiment be repeated?","options":[{"key":"A","text":"To change results"},{"key":"B","text":"To make it longer"},{"key":"C","text":"To improve reliability"},{"key":"D","text":"To avoid recording data"}],"correct":"C","explanation":"Repeating measurements checks consistency and helps identify unusual results.","hint":"Identify the scientific idea being tested, then compare the options."}];

// Shared with the server so quiz answers can be checked consistently.
globalThis.questionsDB = questionsDB;

