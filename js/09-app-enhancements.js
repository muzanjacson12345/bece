
(() => {
  const subjects=["social","arts","maths","computing","rme","integratedScience","french","careerTechnology"];
  const labels={social:"Social Studies",arts:"Creative Arts",maths:"Mathematics",computing:"Computing",rme:"Religious & Moral Education",integratedScience:"Integrated Science",french:"French",careerTechnology:"Career Technology"};
  Object.assign(SUBJECT_LABEL,labels);
  questionsDB.careerTechnology=questionsDB.careerTechnology||[];
  const stems=[
    q=>q,
    q=>"Select the best answer: "+q,
    q=>"A learner is asked in class: "+q+" Which option is correct?",
    q=>"During revision, what is the correct response to: "+q,
    q=>"Choose the answer that correctly completes this question: "+q,
    q=>"Which option should be selected for this question: "+q,
    q=>"In a BECE practice exercise, the question is: "+q+" Which answer is right?",
    q=>"Test your understanding. "+q,
    q=>"Which response correctly answers: "+q,
    q=>"A student checks their notes and asks: "+q+" Choose the accurate answer."
  ];
  const expand=(facts)=>{const chosen=facts.length<=20?facts:Array.from({length:20},(_,i)=>facts[Math.floor(i*facts.length/20)]);return chosen.flatMap(f=>stems.map(stem=>[f[0],stem(f[1]),f[2],f[3],f[4],"Read the key words, compare the options and check the explanation."]));};
  const ctFacts=[
    ["Safety","What should a learner do before using a workshop tool?","Check that it is suitable and safe to use",["Use it without checking","Throw it to a friend","Remove its safety guard"],"Inspect tools and follow instructions before use."],
    ["Safety","What is the purpose of personal protective equipment?","To reduce exposure to workplace hazards",["To decorate the workshop","To replace training","To make tools heavier"],"PPE such as goggles and aprons helps protect the user."],
    ["Safety","What should be done if an electrical cable is damaged?","Stop using the equipment and report it",["Touch the exposed wire","Pour water on it","Continue working"],"Damaged electrical equipment must not be used."],
    ["Safety","Why should workshop floors be kept tidy and dry?","To prevent slips, trips and falls",["To make the room darker","To hide tools","To increase noise"],"Good housekeeping reduces common accidents."],
    ["Safety","How should scissors be passed to another person?","Handle-first with the blades closed",["Thrown across the room","With blades pointing forward","Left open on a chair"],"Passing tools carefully helps prevent injury."],
    ["Design","What is the first step in solving a design problem?","Identify the need or problem",["Start painting immediately","Buy every material","Ignore the user"],"A designer first understands the need and the intended user."],
    ["Design","Why is a sketch made before constructing a product?","To plan the shape, parts and appearance",["To avoid measuring","To waste materials","To replace testing"],"A sketch communicates the design idea."],
    ["Design","What is a prototype?","An early model used to test a design",["A finished product in a shop","A kind of glue","A safety sign"],"A prototype helps test function and identify improvements."],
    ["Measurement","Which instrument measures a short length?","A ruler or measuring tape",["A paintbrush","A saw","A mixing bowl"],"Use a measuring tool suited to the size and accuracy needed."],
    ["Measurement","Which unit is suitable for the length of a small object?","Centimetre",["Litre","Kilogram","Degree Celsius"],"Centimetres are commonly used for small lengths."],
    ["Tools","Which tool is used to drive a nail into wood?","Hammer",["Spanner","Sewing needle","Sieve"],"A hammer is used for striking and driving nails."],
    ["Tools","Which tool tightens or loosens a nut?","Spanner",["Paint roller","Hand saw","Measuring jug"],"A spanner grips a nut or bolt head."],
    ["Tools","What is a saw mainly used for in woodworking?","Cutting wood",["Polishing cloth","Measuring temperature","Joining wires"],"A saw has a toothed blade designed for cutting."],
    ["Materials","Why is copper commonly used for electrical wires?","It conducts electricity well",["It is an electrical insulator","It dissolves in water","It is transparent"],"Copper is a good electrical conductor and can be drawn into wire."],
    ["Materials","Why is rubber used to cover many electrical wires?","It is an electrical insulator",["It is a metal","It attracts water","It produces electricity"],"Rubber helps prevent current from passing to the user."],
    ["Materials","Which material from trees is commonly used to make furniture?","Wood",["Glass","Clay only","Cotton fibre"],"Wood is widely used for furniture and construction."],
    ["Woodwork","What is sanding used for?","Smoothing a wooden surface",["Making wood wet","Measuring angles","Cutting metal"],"Abrasive paper removes roughness from wood."],
    ["Woodwork","Why is a joint used in a wooden product?","To connect pieces of wood",["To colour the wood","To measure its weight","To sharpen a saw"],"Joints hold wooden components together."],
    ["Metalwork","What is corrosion?","Gradual damage caused by a chemical reaction with the environment",["Polishing wood","Weaving cloth","Drying food"],"Rusting is a common form of corrosion in iron."],
    ["Metalwork","Which action can help prevent iron from rusting?","Apply paint or another protective coating",["Leave it wet","Scratch off its coating","Store it in salty water"],"A protective coating reduces contact with water and oxygen."],
    ["Textiles","What is a fibre?","A thin strand used to make yarn or fabric",["A hammer","A cooking pot","A metal fastener"],"Fibres are the basic strands used to make yarn and fabric."],
    ["Textiles","What is weaving?","Interlacing lengthwise and crosswise yarns to make fabric",["Cutting wood into boards","Heating water","Joining metal with bolts"],"Weaving crosses warp and weft yarns."],
    ["Textiles","Which tool is used to sew fabric by hand?","Needle",["Spanner","Chisel","Trowel"],"A needle carries thread through fabric."],
    ["Food & nutrition","Which nutrient is a main source of energy?","Carbohydrate",["Vitamin C only","Water only","Mineral salts only"],"Carbohydrates provide energy for daily activities."],
    ["Food hygiene","Why should hands be washed before preparing food?","To reduce the spread of germs",["To make food sweeter","To change food colour","To remove all nutrients"],"Handwashing helps prevent food contamination."],
    ["Food preparation","Which method cooks food using hot water vapour?","Steaming",["Freezing","Drying","Refrigerating"],"Steaming uses vapour from heated water."],
    ["Nutrition","What does a balanced diet provide?","Different nutrients in suitable amounts",["Only one kind of food","Only sugar","No water"],"A balanced diet supports growth, health and energy needs."],
    ["Food safety","What is food contamination?","The presence of harmful substances or germs in food",["Correct food storage","Washing clean plates","Weighing ingredients"],"Contamination can make food unsafe to eat."],
    ["Agriculture","What is compost?","Decayed organic matter used to improve soil",["A metal tool","A plastic fibre","A type of fuel"],"Compost adds organic matter to soil."],
    ["Agriculture","Why are weeds removed from crop fields?","They compete with crops for water, light and nutrients",["They make all crops grow faster","They produce tools","They replace rainfall"],"Weeds compete with crops for resources."],
    ["Enterprise","Who is an entrepreneur?","A person who organises a business and takes calculated risks",["A person who never plans","A person who only buys for personal use","A person who avoids decisions"],"Entrepreneurs identify opportunities and organise resources."],
    ["Enterprise","Why should a business record sales and expenses?","To understand income, costs and profit",["To make customers wait","To hide every transaction","To avoid planning"],"Records help a business monitor performance."],
    ["Energy","Which of these is a renewable energy source?","Sunlight",["Coal","Petroleum","Natural gas"],"Sunlight is naturally replenished."],
    ["Energy","What is one safe way to save electricity at home?","Switch off lights when they are not needed",["Leave appliances on","Touch exposed wires","Overload sockets"],"Switching off unused lights reduces energy waste."],
    ["Environment","Why should workshop waste be sorted?","To support safe disposal and recycling",["To mix all waste together","To block drains","To increase pollution"],"Sorting separates reusable, recyclable and hazardous materials."],
    ["Finishing","Why is a finish applied to a wooden product?","To improve appearance and protect the surface",["To make it impossible to measure","To weaken every joint","To turn it into cloth"],"Finishes can protect surfaces and improve appearance."],
    ["First aid","What is the first sensible action after a workshop accident?","Stop the activity and alert the teacher",["Hide the accident","Continue using the machine","Crowd around the injured person"],"Stop work and get a responsible adult or trained first aider."],
    ["Quality","Why should a finished product be tested?","To check that it is safe and works as intended",["To make it heavier","To avoid feedback","To damage it"],"Testing checks function, quality and safety."],
    ["Consumers","What should a buyer consider when choosing a product?","Quality, safety, usefulness and price",["Only the colour","Only the package size","Only the seller's name"],"Consumers compare important features before buying."]
  ];
  
  addExtraBank("careerTechnology","ct",expand(ctFacts),1);
  if(questionsDB.careerTechnology.length!==200) throw new Error("Career Technology bank must contain 200 questions.");
  
  questionsDB.careerTechnology.forEach(q=>questionIndex.set(q.id,{...q,subject:"careerTechnology"}));
  globalThis.questionsDB=questionsDB;

  notesDB.careerTechnology=[
    {id:"ct-jhs1-safety",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Design and technology",topic:"Workshop Safety, Tools and Personal Protection",icon:"🦺",readTime:"8 min read",summary:"Learn safe behaviour, workshop rules, protective equipment and responsible tool handling.",sections:[
      {title:"Why safety matters",theory:"A workshop contains tools, materials, machines and activities that can cause injury if used carelessly. Safety means preventing accidents, protecting people and keeping the work area organised.",points:["Follow the teacher's instructions before starting work.","Wear suitable protective equipment when required.","Tie back long hair and keep loose clothing away from moving parts.","Keep floors dry and pathways clear.","Never play or distract someone using a tool."]},
      {title:"Tools and safe handling",points:["A hammer drives nails; a hand saw cuts wood; a spanner turns nuts and bolts.","A ruler or tape measures length; a try square checks a right angle.","Carry sharp tools carefully with the working edge directed away from people.","Do not use damaged tools or machines.","Report accidents and unsafe conditions immediately."]},
      {title:"Responding to an accident",theory:"Stop the activity, make the area safe if this can be done without risk, and alert the teacher or trained first aider. Do not attempt a task beyond your training.",examTip:"Choose the action that prevents further harm and gets responsible help."}]},
    {id:"ct-jhs1-design",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Design process",topic:"Design Thinking, Sketching and Measurement",icon:"📐",readTime:"8 min read",summary:"Follow a design process from identifying a need to planning and testing a solution.",sections:[
      {title:"The design process",theory:"Design and technology uses practical thinking to solve real needs. A designer studies the problem, plans a solution, chooses materials, makes a product and tests it.",steps:["Identify the need and the user.","Research and collect information.","Sketch possible solutions and label important parts.","Choose suitable materials, tools and measurements.","Make a model or prototype safely.","Test the product and improve weak areas."]},
      {title:"Drawing and measurement",points:["Length may be measured in millimetres, centimetres or metres.","A ruler and tape measure are used for length.","A try square checks a right angle.","A prototype is an early model used to test a design.","A good design should be useful, safe and suitable for its user."]}]},
    {id:"ct-jhs2-materials",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Materials and processes",topic:"Wood, Metals, Plastics and Material Properties",icon:"🪵",readTime:"9 min read",summary:"Compare common materials, their properties, uses and ways of protecting them.",sections:[
      {title:"Choosing materials",theory:"Materials are selected according to their properties, cost, availability and the purpose of the product.",points:["Wood is used for furniture and construction; it can be cut, shaped and joined.","Metals are often strong and durable. Copper conducts electricity well.","Plastics are light and can be moulded into many shapes.","Glass is hard and transparent but can be brittle.","Rubber is flexible and often used as an electrical insulator."]},
      {title:"Joining and finishing",points:["Wooden parts may be joined using nails, screws, glue or suitable joints.","Metal parts may be connected using bolts or rivets.","Sanding smooths a wooden surface before finishing.","Paint and protective coatings can reduce corrosion or surface damage.","Choose a joining method that suits the material and product."]}]},
    {id:"ct-jhs2-food",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Home economics",topic:"Food, Nutrition, Hygiene and Preparation",icon:"🥗",readTime:"9 min read",summary:"Understand nutrients, balanced diets, kitchen hygiene and safe cooking methods.",sections:[
      {title:"Nutrients",points:["Carbohydrates provide energy.","Proteins support growth and repair of body tissues.","Fats provide stored energy and help the body use some vitamins.","Vitamins and minerals support normal body functions.","Water helps transport substances and regulate body temperature; fibre supports digestion."]},
      {title:"Balanced diet and food hygiene",theory:"A balanced diet contains a variety of foods in suitable amounts. Food hygiene prevents contamination and food-borne illness.",points:["Wash hands before preparing or eating food.","Use clean utensils and safe water.","Keep raw and cooked foods separate.","Store food at suitable temperatures and cover it.","Wash fruits and vegetables before eating or preparing them."]},
      {title:"Cooking methods",points:["Boiling cooks food in bubbling water.","Steaming uses hot water vapour.","Baking uses dry heat in an oven.","Grilling uses direct heat.","Choose a method that suits the food and avoids unnecessary waste."]}]},
    {id:"ct-jhs3-enterprise",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Enterprise and sustainability",topic:"Entrepreneurship, Costing and Environmental Care",icon:"💡",readTime:"9 min read",summary:"Explore small business planning, records, quality, renewable energy and responsible waste management.",sections:[
      {title:"Entrepreneurship",theory:"An entrepreneur identifies an opportunity, organises resources and takes calculated risks to provide a product or service.",points:["Identify a need in the community.","Describe the product or service.","Estimate material, labour and other costs.","Set a fair selling price and plan how to reach customers.","Keep records of sales, expenses and stock."]},
      {title:"Cost and quality",theory:"Profit is the amount left when total costs are subtracted from sales revenue.",example:"If an item sells for GH₵30 and its total cost is GH₵22, the profit is GH₵8.",points:["Check measurements and workmanship.","Test that the product is safe and works as intended.","Use customer feedback to improve the product."]},
      {title:"Environment and energy",points:["Reuse suitable materials and recycle where possible.","Sort waste instead of dumping everything together.","Use water and electricity carefully.","Solar energy is renewable because sunlight is naturally replenished.","Keep hazardous materials away from drains and water bodies."]}]}
  ];

  notesDB.maths.push(
    {id:"mat-jhs1-number",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Number",topic:"Whole Numbers, Factors, Multiples and Integers",icon:"🔢",readTime:"7 min read",summary:"Revise place value, operations, factors, multiples and integers.",sections:[{title:"Number operations",theory:"Place value tells the value of a digit because of its position. Use the correct order of operations: brackets, powers, division and multiplication, then addition and subtraction.",points:["A factor divides a number exactly.","A multiple is found by multiplying a number by a whole number.","A prime number has exactly two factors: 1 and itself.","When adding integers with different signs, subtract their absolute values and keep the sign of the larger absolute value.","Estimate an answer to check whether it is reasonable."]},{title:"Fractions and percentages",points:["To add fractions, first use a common denominator.","To multiply fractions, multiply the numerators and denominators.","To divide by a fraction, multiply by its reciprocal.","Percentage means 'out of 100'.","Convert a percentage to a decimal by dividing by 100."]}]},
    {id:"mat-jhs2-algebra",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Algebra",topic:"Expressions, Equations and Substitution",icon:"✏️",readTime:"7 min read",summary:"Understand variables, simplify expressions and solve simple equations.",sections:[{title:"Algebraic expressions",theory:"A variable is a letter that represents a number. A term is a number, a variable or a product of numbers and variables. Like terms have the same variable part.",points:["3x + 2x = 5x because the terms are alike.","3x + 2y cannot be combined into one term.","Substitution means replacing a variable with a given value.","Use inverse operations to solve equations.","Whatever operation is done to one side of an equation must also be done to the other side."]},{title:"Worked example",example:"If 3x + 4 = 19, subtract 4 from both sides: 3x = 15. Divide by 3: x = 5.",examTip:"Show each step clearly and check your answer by substituting it into the original equation."}]},
    {id:"mat-jhs3-geometry",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Shape and space",topic:"Angles, Triangles, Area and Volume",icon:"📐",readTime:"8 min read",summary:"Revise angle rules and common measurement formulae.",sections:[{title:"Angle facts",points:["Angles on a straight line add up to 180°.","Angles around a point add up to 360°.","Vertically opposite angles are equal.","Angles in a triangle add up to 180°.","The interior angles of a quadrilateral add up to 360°."]},{title:"Measurement formulae",points:["Rectangle area = length × width.","Triangle area = ½ × base × perpendicular height.","Parallelogram area = base × perpendicular height.","Cuboid volume = length × width × height.","Always write the correct unit, such as cm² for area and cm³ for volume."]},{title:"Solving geometry questions",steps:["Mark the angles or lengths given in the diagram.","Identify the angle or area rule that applies.","Write the equation before calculating.","Substitute the known values carefully.","Check that the answer is sensible and include the unit."]}]}
  );
  notesDB.computing.push(
    {id:"com-jhs1-files",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Digital literacy",topic:"Files, Folders, Operating Systems and Devices",icon:"🖥️",readTime:"7 min read",summary:"Learn how a computer manages information and how common devices work.",sections:[{title:"Hardware and software",theory:"Hardware is the physical part of a computer. Software is the set of programs and instructions that tell the computer what to do.",points:["Input devices send data into a computer, such as a keyboard and mouse.","Output devices present results, such as a monitor, printer and speaker.","The CPU processes instructions.","RAM stores data temporarily while programs are running.","An operating system manages hardware, files and applications."]},{title:"Files and folders",points:["A file stores information such as a document, picture or sound.","A folder helps organise files.","Use meaningful file names so you can find work later.","Save work regularly and keep a backup of important files.","Do not delete a file unless you are sure it is no longer needed."]}]},
    {id:"com-jhs2-internet",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Networks and communication",topic:"Internet, Networks and Responsible Online Behaviour",icon:"🌐",readTime:"8 min read",summary:"Understand networks, browsers, online communication and digital safety.",sections:[{title:"Networks and the internet",theory:"A computer network connects devices so they can share information and resources. The internet is a worldwide network of connected networks.",points:["A web browser is used to open websites.","A search engine helps find information online.","Email is used to send electronic messages.","A strong password should be difficult to guess and kept private.","Not everything published online is accurate; check the source and date."]},{title:"Staying safe online",points:["Do not share passwords or private information with strangers.","Ask a trusted adult or teacher for help with suspicious messages.","Avoid unknown downloads and links.","Use respectful language and do not bully others online.","Tell a trusted adult if something online makes you feel unsafe."]}]},
    {id:"com-jhs3-programming",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Computational thinking",topic:"Algorithms, Flowcharts and Basic Programming",icon:"🧩",readTime:"8 min read",summary:"Plan clear instructions and use sequence, selection and repetition.",sections:[{title:"Algorithms",theory:"An algorithm is a clear sequence of steps for solving a problem. A good algorithm has a clear start, ordered instructions and a definite result.",points:["Sequence means instructions happen in order.","Selection means choosing a path based on a condition.","Repetition means repeating instructions while a condition is met or for a set number of times.","A flowchart uses standard symbols to show steps and decisions.","Testing helps find mistakes in an algorithm or program."]},{title:"Problem-solving example",steps:["Identify the problem and the expected output.","List the input values needed.","Write the steps in plain language or pseudocode.","Trace the steps with sample data.","Correct errors and test again."],examTip:"Use a diamond for a decision in a flowchart and arrows to show the direction of flow."}]}
  );
  notesDB.rme.push(
    {id:"rme-jhs1-values",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Moral values",topic:"Honesty, Respect, Responsibility and Self-Control",icon:"🤝",readTime:"7 min read",summary:"Understand values that guide good behaviour at home, school and in the community.",sections:[{title:"Meaning of moral values",theory:"Moral values are principles that help people decide what is right and wrong. They guide behaviour and support peaceful relationships.",points:["Honesty means telling the truth and acting sincerely.","Respect means treating people with dignity.","Responsibility means accepting duties and their consequences.","Self-control means managing feelings and actions.","Fairness means treating people justly."]},{title:"Applying values",example:"A learner finds a classmate's lost book. Returning it to its owner is an example of honesty and responsibility.",examTip:"When asked about a value, define it and give a clear example from daily life."}]},
    {id:"rme-jhs2-religions",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Religious practices",topic:"Worship, Prayer, Festivals and Sacred Texts",icon:"🕊️",readTime:"8 min read",summary:"Compare how religious communities express faith and worship.",sections:[{title:"Religious practices",theory:"Religion can shape beliefs, worship, moral teaching and community life. Practices differ between traditions and communities.",points:["Prayer is a way believers communicate with the Supreme Being.","Worship may include prayer, songs, readings and acts of service.","Festivals can help communities remember important events and teachings.","Sacred texts guide belief and practice.","Show respect when learning about religions different from your own."]},{title:"Learning respectfully",theory:"When comparing religions, describe each tradition accurately instead of assuming all believers practise in exactly the same way.",examTip:"Use examples from the religions studied in class and avoid disrespectful language."}]},
    {id:"rme-jhs3-peace",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Community and citizenship",topic:"Peace, Tolerance, Conflict Resolution and Service",icon:"🕊️",readTime:"8 min read",summary:"Explore peaceful ways to resolve disagreement and contribute to society.",sections:[{title:"Peaceful living",points:["Tolerance means accepting that people may have different beliefs and opinions.","Dialogue allows people to explain their views and listen to others.","Forgiveness can help repair relationships after wrongdoing.","Cooperation helps groups achieve shared goals.","Community service means helping improve the lives of others."]},{title:"Resolving conflict",steps:["Stay calm and make sure everyone is safe.","Listen to each person's point of view.","Identify the issue rather than attacking the person.","Look for a fair solution or ask a trusted mediator for help.","Agree on how to prevent the problem from happening again."]}]}
  );
  notesDB.integratedScience.push(
    {id:"sci-jhs1-matter",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"Diversity of matter",topic:"Matter, States and Changes of State",icon:"🧪",readTime:"8 min read",summary:"Describe matter and explain how heating and cooling cause changes of state.",sections:[{title:"What is matter?",theory:"Matter is anything that has mass and occupies space. The three common states are solid, liquid and gas.",points:["Solids have a fixed shape and volume.","Liquids have a fixed volume but take the shape of their container.","Gases have no fixed shape or volume and spread to fill their container.","Melting changes a solid into a liquid.","Evaporation changes a liquid into a gas; condensation changes gas into liquid."]},{title:"Physical and chemical changes",theory:"A physical change does not form a new substance, while a chemical change forms one or more new substances.",points:["Melting ice is a physical change.","Dissolving sugar in water is usually a physical change.","Rusting iron is a chemical change.","Burning paper is a chemical change.","Observe evidence such as colour change, gas production or formation of a new solid."]}]},
    {id:"sci-jhs2-energy",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Energy",topic:"Forms, Sources and Transfer of Energy",icon:"⚡",readTime:"8 min read",summary:"Identify common energy forms and explain how energy is transferred.",sections:[{title:"Forms of energy",points:["Light energy enables us to see and supports photosynthesis.","Sound energy is produced by vibrations.","Heat energy is transferred from warmer objects to cooler ones.","Electrical energy powers many appliances.","Chemical energy is stored in fuels and food."]},{title:"Energy sources",theory:"Renewable sources are naturally replenished, while non-renewable sources are finite and take a very long time to form.",points:["Solar and wind energy are renewable.","Coal, petroleum and natural gas are non-renewable fossil fuels.","Energy can be transferred from one form to another.","Use energy efficiently to reduce waste and pollution."]}]},
    {id:"sci-jhs3-forces",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Forces and motion",topic:"Forces, Friction, Pressure and Simple Machines",icon:"🧲",readTime:"8 min read",summary:"Understand how forces affect motion and how simple machines make work easier.",sections:[{title:"Forces",theory:"A force is a push or pull. Forces can change an object's speed, direction or shape.",points:["Friction acts against motion between surfaces in contact.","Gravity attracts objects towards the Earth.","A balanced set of forces does not change an object's motion.","Pressure is force acting per unit area.","A simple machine changes the size or direction of a force."]},{title:"Simple machines",points:["A lever turns around a fixed point called a fulcrum.","A pulley can change the direction of a force.","An inclined plane is a sloping surface.","Machines make tasks easier but do not remove the need for energy.","Give examples of simple machines found at home and school."]}]}
  );
  notesDB.french.push(
    {id:"fre-jhs1-vocabulary",level:"jhs1",levelLabel:"JHS 1 (Basic 7)",strand:"French basics",topic:"Numbers, Days, Months and Classroom Words",icon:"🇫🇷",readTime:"7 min read",summary:"Build beginner vocabulary for counting, dates and the classroom.",sections:[{title:"Numbers",theory:"Learn numbers in small groups and say them aloud. Use them when giving your age, counting objects and stating prices.",points:["un = one; deux = two; trois = three; quatre = four; cinq = five.","six = six; sept = seven; huit = eight; neuf = nine; dix = ten.","Practise saying numbers in order and then in random order."]},{title:"Days and classroom words",points:["lundi = Monday; mardi = Tuesday; mercredi = Wednesday.","jeudi = Thursday; vendredi = Friday; samedi = Saturday; dimanche = Sunday.","un livre = a book; un stylo = a pen; une classe = a classroom.","Quelle date sommes-nous ? = What is the date?"]}]},
    {id:"fre-jhs2-articles",level:"jhs2",levelLabel:"JHS 2 (Basic 8)",strand:"Grammar",topic:"French Articles, Gender and Simple Adjectives",icon:"📘",readTime:"8 min read",summary:"Learn how articles match nouns and how simple adjectives describe people and things.",sections:[{title:"Articles",theory:"French nouns are masculine or feminine. Articles change according to gender and number.",points:["un and le are masculine singular forms.","une and la are feminine singular forms.","des and les are plural forms.","Learn each new noun with its article, for example un livre and une table.","Do not assume a noun's gender from its English meaning."]},{title:"Adjectives",theory:"An adjective describes a noun. Many French adjectives change spelling to agree with the noun.",points:["grand can describe something masculine; grande is a common feminine form.","petit and petite mean small.","Place adjectives according to the pattern taught for that adjective.","Practise with short noun phrases before writing longer sentences."]}]},
    {id:"fre-jhs3-sentences",level:"jhs3",levelLabel:"JHS 3 (Basic 9)",strand:"Communication",topic:"Present-Tense Verbs and Everyday Sentences",icon:"💬",readTime:"8 min read",summary:"Use a few common verbs to make simple statements and questions.",sections:[{title:"Useful verbs",points:["être = to be; avoir = to have; aller = to go; faire = to do or make.","Je suis = I am; tu es = you are; il/elle est = he/she is.","J'ai = I have; tu as = you have; il/elle a = he/she has.","Learn the subject pronoun together with the verb form."]},{title:"Build a simple sentence",example:"Je m'appelle Ama. = My name is Ama. J'habite à Accra. = I live in Accra. J'aime lire. = I like reading.",examTip:"Read the whole sentence, identify the subject and verb, then use context to choose the missing word. Keep French sentences short and clear."}]}
  );
  const flash=document.getElementById("flash-subject");
  if(flash){if(![...flash.options].some(o=>o.value==="careerTechnology"))flash.add(new Option("Career Technology","careerTechnology"));}
  Setup.subjects=["social"];Setup.subjectCount=1;Setup.topic="all";
  const ensureSelection=()=>{if(!Array.isArray(Setup.subjects))Setup.subjects=[];Setup.subject=Setup.subjects[0]||"social";};
  const subjectLimit=()=>Setup.subjectCount==="multiple"?subjects.length:Number(Setup.subjectCount||1);
  Setup.selectedCount=subjectLimit;
  const subjectChoiceValid=()=>Setup.subjectCount==="multiple"?Setup.subjects.length>=2:Setup.subjects.length===subjectLimit();
  Setup.open=function(subject){if(subject&&subjects.includes(subject)){this.subjects=[subject];this.subject=subject;this.subjectCount=1;}else{ensureSelection();}this.topic="all";navigate("setup");};
  Setup.pool=function(){ensureSelection();const topic=document.getElementById("topic-sel").value||"all";return this.subjects.flatMap(sub=>(questionsDB[sub]||[]).filter(q=>topic==="all"||q.topic===topic));};
  Setup.allPool=function(){ensureSelection();return this.subjects.flatMap(sub=>questionsDB[sub]||[]);};
  Setup.renderSubject=function(){
    ensureSelection();
    const countBox=document.getElementById("quiz-subject-count");
    if(countBox&&!countBox.dataset.ready){
      [1,2,3,4,5,"multiple"].forEach(n=>{
        const btn=document.createElement("button");
        btn.type="button";btn.className="length-option";
        btn.textContent=n==="multiple"?"Multi":String(n);
        btn.dataset.subjectCount=String(n);
        btn.setAttribute("aria-label",n==="multiple"?"Choose multiple subjects":("Choose "+n+" "+(n===1?"subject":"subjects")));
        btn.title=btn.getAttribute("aria-label");
        btn.addEventListener("click",()=>{
          const changed=this.subjectCount!==n;
          this.subjectCount=n;
          const max=n==="multiple"?subjects.length:Number(n);
          if(this.subjects.length>max)this.subjects=this.subjects.slice(0,max);
          this.topic="all";
          this.renderSubject();
          if(changed)replayMotion(btn,"motion-setup-count-selected");
        });
        countBox.append(btn);
      });
      countBox.dataset.ready="1";
    }
    const max=subjectLimit(),selected=this.subjects.length,multiple=this.subjectCount==="multiple";
    document.querySelectorAll("[data-setup-sub]").forEach(btn=>{
      const active=this.subjects.includes(btn.dataset.setupSub);
      btn.setAttribute("aria-pressed",String(active));
      btn.disabled=!active&&selected>=max;
    });
    document.querySelectorAll("[data-subject-count]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.subjectCount===String(this.subjectCount))));
    countBox?.querySelectorAll("button").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.subjectCount===String(this.subjectCount))));
    const hint=document.getElementById("quiz-subject-hint");
    if(hint)hint.textContent=multiple?("2 or more · "+selected+" selected"):(selected+"/"+max+" selected");
    const start=document.getElementById("setup-start");
    if(start)start.disabled=!subjectChoiceValid();
    const multi=selected>1;
    document.getElementById("topic-label").hidden=multi;
    document.getElementById("topic-sel").hidden=multi;
    document.getElementById("setup-pool").hidden=multi;
    this.topic=multi?"all":(this.topic||"all");
    const counts={};this.allPool().forEach(q=>counts[q.topic]=(counts[q.topic]||0)+1);
    const sel=document.getElementById("topic-sel");
    sel.replaceChildren(new Option("All topics ("+this.allPool().length+")","all"),...Object.keys(counts).sort().map(t=>new Option(t+" ("+counts[t]+")",t)));
    sel.value=!multi&&this.topic&&counts[this.topic]?this.topic:"all";
    this.update();
  };
  Setup.update=function(){
    const sel=document.getElementById("topic-sel");
    this.topic=sel.value||"all";
    const count=this.pool().length;
    document.getElementById("setup-pool").textContent=count+" questions available in this selection";
    const lengths=[5,10,20,40,60,100,200,0];
    if(this.length&&this.length>=count)this.length=0;
    const box=document.getElementById("length-buttons");
    box.replaceChildren();
    lengths.forEach(n=>{
      if(n&&n>=count)return;
      const btn=document.createElement("button");
      btn.type="button";btn.className="length-option";btn.textContent=n?String(n):"All "+count;
      btn.dataset.setupLength=String(n);
      btn.setAttribute("aria-pressed",String(n===this.length));
      btn.addEventListener("click",()=>{
        const changed=Setup.length!==n;
        Setup.length=n;Setup.update();
        if(changed)replayMotion(document.querySelector('#length-buttons [data-setup-length="'+n+'"]'),"motion-setup-length-selected");
      });
      box.append(btn);
    });
    document.querySelectorAll("[data-mode]").forEach(btn=>btn.setAttribute("aria-checked",String(btn.dataset.mode===this.mode)));
    const total=Math.min(this.length||count,count),secs=total*40;
    document.getElementById("mode-description").textContent=this.mode==="exam"
      ?"Timed mock: "+Math.floor(secs/60)+" min "+(secs%60?secs%60+" sec ":"")+"for "+total+" questions. Explanations appear when you finish."
      :"Practice: no timer. See explanations after answers and use hints when you need them.";
  };
  Setup.start=function(){
    ensureSelection();
    if(!subjectChoiceValid()){
      toast(this.subjectCount==="multiple"?"Choose at least two subjects.":"Choose exactly "+subjectLimit()+" subjects.");
      return;
    }
    const pool=this.pool();
    if(!pool.length){toast("There are no questions in this selection yet.");return;}
    const label=this.subjects.map(s=>labels[s]).join(" + ");
    Quiz.start({pool,length:this.length,mode:this.mode,subject:this.subjects.length===1?this.subjects[0]:"mixed",label:label+(this.topic!=="all"?" · "+this.topic:"")});
  };
  document.addEventListener("click",event=>{
    const one=event.target.closest("[data-setup-sub]");
    if(!one||one.disabled)return;
    ensureSelection();
    const key=one.dataset.setupSub;
    const max=subjectLimit();
    const changed=Setup.subjects.includes(key)||Setup.subjects.length<max;
    if(Setup.subjects.includes(key)){
      Setup.subjects=Setup.subjects.filter(x=>x!==key);
    }else if(Setup.subjects.length<max){
      Setup.subjects.push(key);
    }
    Setup.subject=Setup.subjects[0]||"social";
    Setup.topic="all";
    Setup.renderSubject();
    if(changed)replayMotion(one,"motion-setup-subject-selected");
  });
  document.querySelectorAll("[data-notes-sub='careerTechnology']").forEach(btn=>btn.addEventListener("click",()=>{Notes.sub=btn.dataset.notesSub;Notes.activeId=null;Notes.refresh({keepScroll:false});}));
  Home.render();
})();
