(function () {
'use strict';

/* ————————————————————————————————————————————————
   Nochmal — A1 course content
   ————————————————————————————————————————————————
   課程骨架照著 Nicos Weg A1 的主題順序走（使用者正在看的那套影片），
   但句子全部重寫成正確拼寫與標點的德文 —— YouTube 自動字幕的品質
   不能當學習素材（全小寫、無標點、"gut morgen vor schneider"）。

   每個句子四個欄位：
     de   目標句（要產出的東西）
     en   英文提示（Recall 模式從這裡出發）
     lit  逐字直譯，用連字號把德文的一個詞綁成英文的一團。
          英語母語者最大的障礙是語序與格位，直譯把結構攤開來看。
     note 用法或文法提醒，選填

   patterns 是替換練習（audio-lingual substitution drill）：
   一個框架配多個槽位，跑起來就是幾十題，語感靠這種變化長出來。
   ———————————————————————————————————————————————— */

const COURSE = [

/* ——— 1 ——— */
{
  id: 'u1',
  title: 'Greetings & goodbyes',
  de: 'Begrüßen und Verabschieden',
  focus: 'The two “you”s: formal Sie vs. informal du',
  grammar: [
    'German has two words for "you". <b>Sie</b> (always capitalised) for strangers, officials, older people you are not close to. <b>du</b> for friends, family, children, fellow students.',
    'Getting this wrong is the single most visible mistake a learner makes, so every greeting below is tagged formal or informal. Learn them in pairs.',
    'Questions with a question word put the verb second: <b>Wie</b> geht <b>es</b> Ihnen? — literally "How goes it to you?"',
  ],
  items: [
    { id:'u1-01', de:'Guten Morgen!', en:'Good morning!', lit:'Good morning!' },
    { id:'u1-02', de:'Guten Tag, Frau Schneider.', en:'Hello, Mrs Schneider. (during the day)', lit:'Good day, Mrs Schneider.', note:'Guten Tag is the safe, neutral greeting from late morning until early evening.' },
    { id:'u1-03', de:'Guten Abend!', en:'Good evening!', lit:'Good evening!' },
    { id:'u1-04', de:'Wie geht es Ihnen?', en:'How are you? (formal)', lit:'How goes it to-you(formal)?', note:'Formal. The person is in the dative case: Ihnen, not Sie.' },
    { id:'u1-05', de:'Danke, gut. Und Ihnen?', en:'Fine, thanks. And you? (formal)', lit:'Thanks, good. And to-you(formal)?' },
    { id:'u1-06', de:'Hallo Lena, wie geht’s?', en:'Hi Lena, how are you?', lit:'Hello Lena, how goes-it?', note:'wie geht’s = wie geht es. Informal, used constantly.' },
    { id:'u1-07', de:'Sehr gut, danke. Und dir?', en:'Very good, thanks. And you? (informal)', lit:'Very good, thanks. And to-you(informal)?' },
    { id:'u1-08', de:'Es geht.', en:'So-so. / Not bad.', lit:'It goes.', note:'The standard lukewarm answer. Very German.' },
    { id:'u1-09', de:'Nicht so gut.', en:'Not so good.', lit:'Not so good.' },
    { id:'u1-10', de:'Auf Wiedersehen!', en:'Goodbye! (formal)', lit:'On again-seeing!' },
    { id:'u1-11', de:'Tschüss, bis morgen!', en:'Bye, see you tomorrow!', lit:'Bye, until tomorrow!' },
    { id:'u1-12', de:'Bis bald!', en:'See you soon!', lit:'Until soon!' },
    { id:'u1-13', de:'Gute Reise!', en:'Have a good trip!', lit:'Good journey!' },
    { id:'u1-14', de:'Entschuldigung, …', en:'Excuse me, …', lit:'Excuse(noun), …', note:'Use it to stop a stranger. To apologise properly: Entschuldigung! or Tut mir leid.' },
    { id:'u1-15', de:'Vielen Dank!', en:'Thank you very much!', lit:'Many thanks!' },
    { id:'u1-16', de:'Bitte schön.', en:'You’re welcome. / Here you go.', lit:'Please nicely.', note:'bitte does a lot of work: please, you’re welcome, here you are, pardon?' },
  ],
  patterns: [
    { frame:'Guten ___!', en:'Good ___!', slots:[
      {de:'Morgen', en:'morning'}, {de:'Tag', en:'day'}, {de:'Abend', en:'evening'},
    ]},
    { frame:'Wie geht es ___?', en:'How is ___?', slots:[
      {de:'Ihnen', en:'you (formal)'}, {de:'dir', en:'you (informal)'},
      {de:'euch', en:'you (plural, informal)'}, {de:'deiner Mutter', en:'your mother'},
    ]},
  ],
},

/* ——— 2 ——— */
{
  id: 'u2',
  title: 'Introducing yourself',
  de: 'Sich vorstellen',
  focus: 'Verb second, and the verb endings for ich / du / Sie',
  grammar: [
    'The conjugated verb is <b>always</b> in second position in a statement: <i>Ich <b>komme</b> aus Spanien.</i> / <i>Heute <b>komme</b> ich aus Spanien.</i> Whatever you put first, the verb still lands second.',
    'Regular endings: ich komm<b>e</b>, du komm<b>st</b>, er/sie komm<b>t</b>, wir komm<b>en</b>, ihr komm<b>t</b>, sie/Sie komm<b>en</b>.',
    'Yes/no questions flip the verb to the front: <i><b>Sprechen</b> Sie Englisch?</i>',
  ],
  items: [
    { id:'u2-01', de:'Wie heißen Sie?', en:'What is your name? (formal)', lit:'How are-called you(formal)?', note:'German asks "how are you called", not "what is your name".' },
    { id:'u2-02', de:'Ich heiße Nico.', en:'My name is Nico.', lit:'I am-called Nico.' },
    { id:'u2-03', de:'Wie ist dein Name?', en:'What is your name? (informal)', lit:'How is your name?' },
    { id:'u2-04', de:'Woher kommst du?', en:'Where are you from?', lit:'From-where come you?' },
    { id:'u2-05', de:'Ich komme aus Spanien.', en:'I am from Spain.', lit:'I come out-of Spain.' },
    { id:'u2-06', de:'Wo wohnst du?', en:'Where do you live?', lit:'Where live you?', note:'wo = where (location), woher = where from, wohin = where to.' },
    { id:'u2-07', de:'Ich wohne in Berlin.', en:'I live in Berlin.', lit:'I live in Berlin.' },
    { id:'u2-08', de:'Sprechen Sie Englisch?', en:'Do you speak English?', lit:'Speak you(formal) English?' },
    { id:'u2-09', de:'Ich spreche ein bisschen Deutsch.', en:'I speak a little German.', lit:'I speak a little-bit German.' },
    { id:'u2-10', de:'Ich lerne Deutsch.', en:'I am learning German.', lit:'I learn German.', note:'German has no separate continuous tense. "I learn" and "I am learning" are the same words.' },
    { id:'u2-11', de:'Wie schreibt man das?', en:'How do you spell that?', lit:'How writes one that?', note:'man = the impersonal "one/you". Not the same as Mann (man).' },
    { id:'u2-12', de:'Können Sie das bitte wiederholen?', en:'Could you repeat that, please?', lit:'Can you(formal) that please repeat?', note:'A modal verb sends the main verb to the very end. This is the core of German word order.' },
    { id:'u2-13', de:'Das verstehe ich nicht.', en:'I don’t understand that.', lit:'That understand I not.', note:'"Das" first for emphasis, so the verb is still second and ich moves behind it.' },
    { id:'u2-14', de:'Sprechen Sie bitte langsamer.', en:'Please speak more slowly.', lit:'Speak you(formal) please slower.' },
    { id:'u2-15', de:'Freut mich!', en:'Nice to meet you!', lit:'Pleases me!' },
    { id:'u2-16', de:'Ich bin neu hier.', en:'I am new here.', lit:'I am new here.' },
  ],
  patterns: [
    { frame:'Ich komme aus ___.', en:'I am from ___.', slots:[
      {de:'Taiwan', en:'Taiwan'}, {de:'Deutschland', en:'Germany'}, {de:'der Schweiz', en:'Switzerland'},
      {de:'Spanien', en:'Spain'}, {de:'den USA', en:'the USA'},
    ]},
    { frame:'Ich spreche ___.', en:'I speak ___.', slots:[
      {de:'Deutsch', en:'German'}, {de:'Englisch', en:'English'},
      {de:'Chinesisch', en:'Chinese'}, {de:'ein bisschen Französisch', en:'a little French'},
    ]},
  ],
},

/* ——— 3 ——— */
{
  id: 'u3',
  title: 'Family & people',
  de: 'Familie und Menschen',
  focus: 'The accusative case, where der quietly becomes den',
  grammar: [
    'Three genders, three articles: <b>der</b> Vater, <b>die</b> Mutter, <b>das</b> Kind. Learn every noun together with its article — there is no reliable shortcut.',
    'After <i>haben</i> the object takes the accusative. Only masculine visibly changes: ein<b>en</b> Bruder, but ein<b>e</b> Schwester, ein Kind.',
    'Jobs drop the article: <i>Mein Vater ist Anwalt.</i> — no "a". Female forms usually add <b>-in</b>: Anwalt → Anwält<b>in</b>.',
  ],
  items: [
    { id:'u3-01', de:'Das ist meine Familie.', en:'This is my family.', lit:'That is my family.' },
    { id:'u3-02', de:'Ich habe einen Bruder und eine Schwester.', en:'I have a brother and a sister.', lit:'I have a(acc.masc) brother and a sister.', note:'einen for der Bruder, eine for die Schwester.' },
    { id:'u3-03', de:'Meine Mutter ist Ingenieurin.', en:'My mother is an engineer.', lit:'My mother is engineer(female).' },
    { id:'u3-04', de:'Mein Vater ist Anwalt.', en:'My father is a lawyer.', lit:'My father is lawyer.' },
    { id:'u3-05', de:'Meine Tante hat ein Geschäft.', en:'My aunt has a shop.', lit:'My aunt has a shop.' },
    { id:'u3-06', de:'Sie ist acht Jahre alt.', en:'She is eight years old.', lit:'She is eight years old.' },
    { id:'u3-07', de:'Wie alt bist du?', en:'How old are you?', lit:'How old are you?' },
    { id:'u3-08', de:'Ich bin dreißig Jahre alt.', en:'I am thirty years old.', lit:'I am thirty years old.' },
    { id:'u3-09', de:'Bist du verheiratet?', en:'Are you married?', lit:'Are you married?' },
    { id:'u3-10', de:'Ich bin ledig.', en:'I am single.', lit:'I am single.' },
    { id:'u3-11', de:'Hast du Kinder?', en:'Do you have children?', lit:'Have you children?' },
    { id:'u3-12', de:'Meine Großeltern wohnen in München.', en:'My grandparents live in Munich.', lit:'My grandparents live in Munich.' },
    { id:'u3-13', de:'Was machst du beruflich?', en:'What do you do for a living?', lit:'What do you professionally?' },
    { id:'u3-14', de:'Ich arbeite als Lehrer.', en:'I work as a teacher.', lit:'I work as teacher.' },
    { id:'u3-15', de:'Mein Bruder ist noch Student.', en:'My brother is still a student.', lit:'My brother is still student.' },
    { id:'u3-16', de:'Wir haben einen Hund.', en:'We have a dog.', lit:'We have a(acc.masc) dog.' },
  ],
  patterns: [
    { frame:'Ich habe ___.', en:'I have ___.', slots:[
      {de:'einen Bruder', en:'a brother'}, {de:'eine Schwester', en:'a sister'},
      {de:'ein Kind', en:'a child'}, {de:'zwei Kinder', en:'two children'},
      {de:'keine Geschwister', en:'no siblings'},
    ]},
    { frame:'Mein Vater ist ___.', en:'My father is ___.', slots:[
      {de:'Anwalt', en:'a lawyer'}, {de:'Lehrer', en:'a teacher'},
      {de:'Arzt', en:'a doctor'}, {de:'Ingenieur', en:'an engineer'},
      {de:'Rentner', en:'retired'},
    ]},
  ],
},

/* ——— 4 ——— */
{
  id: 'u4',
  title: 'Numbers, time & appointments',
  de: 'Zahlen, Uhrzeit und Termine',
  focus: 'Telling the time — and the half-hour trap',
  grammar: [
    '<b>halb acht</b> means 7:30, not 8:30. German counts <i>towards</i> the coming hour: half of the eighth hour.',
    'Viertel vor sieben = 6:45 (a quarter before seven). Viertel nach sieben = 7:15.',
    'Time expressions take prepositions: <b>um</b> acht Uhr (at eight), <b>am</b> Freitag (on Friday), <b>im</b> Januar (in January).',
  ],
  items: [
    { id:'u4-01', de:'Wie spät ist es?', en:'What time is it?', lit:'How late is it?' },
    { id:'u4-02', de:'Es ist halb acht.', en:'It is half past seven.', lit:'It is half eight.', note:'7:30. Half WAY TO eight, not half past eight. Burn this in.' },
    { id:'u4-03', de:'Es ist Viertel vor sieben.', en:'It is a quarter to seven.', lit:'It is quarter before seven.' },
    { id:'u4-04', de:'Um wie viel Uhr treffen wir uns?', en:'What time shall we meet?', lit:'At how much clock meet we us?' },
    { id:'u4-05', de:'Wir treffen uns um acht Uhr.', en:'We are meeting at eight o’clock.', lit:'We meet us at eight clock.' },
    { id:'u4-06', de:'Heute ist Montag.', en:'Today is Monday.', lit:'Today is Monday.' },
    { id:'u4-07', de:'Morgen ist Dienstag.', en:'Tomorrow is Tuesday.', lit:'Tomorrow is Tuesday.', note:'morgen = tomorrow, der Morgen = the morning. Capital letter decides.' },
    { id:'u4-08', de:'Ich habe am Freitag einen Termin.', en:'I have an appointment on Friday.', lit:'I have on-the Friday an appointment.' },
    { id:'u4-09', de:'Wann hast du Zeit?', en:'When do you have time?', lit:'When have you time?' },
    { id:'u4-10', de:'Am Wochenende habe ich frei.', en:'I am off at the weekend.', lit:'On-the weekend have I free.', note:'Time phrase first, so verb second, ich third.' },
    { id:'u4-11', de:'Tut mir leid, ich habe keine Zeit.', en:'Sorry, I don’t have time.', lit:'Does to-me sorrow, I have no time.' },
    { id:'u4-12', de:'Ich komme ein bisschen später.', en:'I’ll be a little late.', lit:'I come a little-bit later.' },
    { id:'u4-13', de:'Von neun bis fünf.', en:'From nine to five.', lit:'From nine until five.' },
    { id:'u4-14', de:'Jeden Tag um sieben Uhr.', en:'Every day at seven o’clock.', lit:'Every(acc) day at seven clock.' },
    { id:'u4-15', de:'Der Termin ist um Viertel nach drei.', en:'The appointment is at a quarter past three.', lit:'The appointment is at quarter after three.' },
    { id:'u4-16', de:'Passt es Ihnen am Mittwoch?', en:'Does Wednesday suit you?', lit:'Fits it to-you(formal) on-the Wednesday?' },
  ],
  patterns: [
    { frame:'Ich habe am ___ einen Termin.', en:'I have an appointment on ___.', slots:[
      {de:'Montag', en:'Monday'}, {de:'Dienstag', en:'Tuesday'}, {de:'Mittwoch', en:'Wednesday'},
      {de:'Donnerstag', en:'Thursday'}, {de:'Freitag', en:'Friday'},
    ]},
    { frame:'Es ist ___.', en:'It is ___.', slots:[
      {de:'halb acht', en:'7:30'}, {de:'Viertel vor sieben', en:'6:45'},
      {de:'Viertel nach zehn', en:'10:15'}, {de:'zwölf Uhr', en:'12:00'},
      {de:'kurz vor eins', en:'just before 1'},
    ]},
  ],
},

/* ——— 5 ——— */
{
  id: 'u5',
  title: 'Food & drink',
  de: 'Essen und Trinken',
  focus: 'möchte, mögen, and saying you like doing something with gern',
  grammar: [
    '<b>gern</b> is not a verb. You keep the normal verb and add gern: <i>Ich esse <b>gern</b> Käse</i> = I like eating cheese.',
    '<b>Ich möchte</b> = I would like (polite, for ordering). <b>Ich mag</b> = I like (general taste).',
    'Negation: <b>nicht</b> negates verbs and adjectives, <b>kein</b> negates nouns. <i>Ich mag <b>keinen</b> Fisch</i>, not "nicht Fisch".',
  ],
  items: [
    { id:'u5-01', de:'Ich habe Hunger.', en:'I am hungry.', lit:'I have hunger.', note:'German "has" hunger, it does not "be" hungry.' },
    { id:'u5-02', de:'Ich habe Durst.', en:'I am thirsty.', lit:'I have thirst.' },
    { id:'u5-03', de:'Was möchtest du trinken?', en:'What would you like to drink?', lit:'What would-like you to-drink?', note:'The second verb goes to the end.' },
    { id:'u5-04', de:'Ich möchte einen Kaffee, bitte.', en:'I would like a coffee, please.', lit:'I would-like a(acc.masc) coffee, please.' },
    { id:'u5-05', de:'Ich esse gern Käse.', en:'I like eating cheese.', lit:'I eat gladly cheese.' },
    { id:'u5-06', de:'Ich mag keinen Fisch.', en:'I don’t like fish.', lit:'I like no(acc.masc) fish.' },
    { id:'u5-07', de:'Zum Frühstück esse ich Brot mit Marmelade.', en:'For breakfast I eat bread with jam.', lit:'To-the breakfast eat I bread with jam.' },
    { id:'u5-08', de:'Es ist kein Obst da.', en:'There is no fruit.', lit:'It is no fruit there.' },
    { id:'u5-09', de:'Die Butter ist im Kühlschrank.', en:'The butter is in the fridge.', lit:'The butter is in-the fridge.' },
    { id:'u5-10', de:'Schmeckt es dir?', en:'Do you like it? (of food)', lit:'Tastes it to-you?' },
    { id:'u5-11', de:'Das schmeckt sehr gut.', en:'That tastes very good.', lit:'That tastes very good.' },
    { id:'u5-12', de:'Ich bin satt.', en:'I am full.', lit:'I am full(of food).', note:'Never say "Ich bin voll" — that means drunk.' },
    { id:'u5-13', de:'Möchtest du noch etwas?', en:'Would you like anything else?', lit:'Would-like you still something?' },
    { id:'u5-14', de:'Trinkst du Tee oder Kaffee?', en:'Do you drink tea or coffee?', lit:'Drink you tea or coffee?' },
    { id:'u5-15', de:'Ich nehme noch ein Stück Kuchen.', en:'I’ll have another slice of cake.', lit:'I take still a piece cake.' },
    { id:'u5-16', de:'Wir kaufen Milch, Eier und Brot.', en:'We are buying milk, eggs and bread.', lit:'We buy milk, eggs and bread.' },
  ],
  patterns: [
    { frame:'Ich möchte ___, bitte.', en:'I would like ___, please.', slots:[
      {de:'einen Kaffee', en:'a coffee'}, {de:'ein Bier', en:'a beer'},
      {de:'eine Suppe', en:'a soup'}, {de:'ein Glas Wasser', en:'a glass of water'},
      {de:'zwei Stück Apfelkuchen', en:'two pieces of apple cake'},
    ]},
    { frame:'Ich esse gern ___.', en:'I like eating ___.', slots:[
      {de:'Käse', en:'cheese'}, {de:'Fisch', en:'fish'}, {de:'Gemüse', en:'vegetables'},
      {de:'Kuchen', en:'cake'}, {de:'Brot mit Butter', en:'bread and butter'},
    ]},
  ],
},

/* ——— 6 ——— */
{
  id: 'u6',
  title: 'At the restaurant',
  de: 'Im Restaurant',
  focus: 'Ordering, paying, and the polite subjunctive hätte',
  grammar: [
    '<b>Ich hätte gern …</b> is the politest way to order: "I would like to have …". Slightly softer than <i>Ich möchte</i>, and it sounds native.',
    'When paying, the waiter asks <b>Zusammen oder getrennt?</b> — together or separately. Splitting the bill is completely normal.',
    'Tipping: round up and say <b>Stimmt so</b> ("keep the change") as you hand over the money, before they give change back.',
  ],
  items: [
    { id:'u6-01', de:'Haben Sie einen Tisch frei?', en:'Do you have a table free?', lit:'Have you(formal) a(acc.masc) table free?' },
    { id:'u6-02', de:'Ein Tisch für zwei Personen, bitte.', en:'A table for two, please.', lit:'A table for two persons, please.' },
    { id:'u6-03', de:'Wir hätten gern die Speisekarte.', en:'We’d like the menu.', lit:'We would-have gladly the menu.' },
    { id:'u6-04', de:'Ich nehme die Suppe.', en:'I’ll have the soup.', lit:'I take the soup.' },
    { id:'u6-05', de:'Ich möchte eine Pizza Salami, bitte.', en:'I would like a salami pizza, please.', lit:'I would-like a pizza salami, please.' },
    { id:'u6-06', de:'Was können Sie empfehlen?', en:'What can you recommend?', lit:'What can you(formal) recommend?' },
    { id:'u6-07', de:'Die Rechnung, bitte.', en:'The bill, please.', lit:'The bill, please.' },
    { id:'u6-08', de:'Zusammen oder getrennt?', en:'Together or separately?', lit:'Together or separated?' },
    { id:'u6-09', de:'Zusammen, bitte.', en:'Together, please.', lit:'Together, please.' },
    { id:'u6-10', de:'Das macht zwölf Euro vierzig.', en:'That comes to twelve euros forty.', lit:'That makes twelve euro forty.' },
    { id:'u6-11', de:'Stimmt so.', en:'Keep the change.', lit:'Is-correct so.' },
    { id:'u6-12', de:'Du bist eingeladen.', en:'It’s on me. / You’re invited.', lit:'You are invited.' },
    { id:'u6-13', de:'Wir haben erst um Viertel vor acht einen Tisch frei.', en:'We only have a table free at a quarter to eight.', lit:'We have only-then at quarter before eight a table free.', note:'erst = not until, only at. Different from nur (only, quantity).' },
    { id:'u6-14', de:'Guten Appetit!', en:'Enjoy your meal!', lit:'Good appetite!' },
    { id:'u6-15', de:'Können wir bitte am Fenster sitzen?', en:'Could we sit by the window, please?', lit:'Can we please at-the window sit?' },
    { id:'u6-16', de:'Ich zahle mit Karte.', en:'I’ll pay by card.', lit:'I pay with card.' },
  ],
  patterns: [
    { frame:'Ich hätte gern ___.', en:'I’d like ___.', slots:[
      {de:'die Speisekarte', en:'the menu'}, {de:'einen Salat', en:'a salad'},
      {de:'die Rechnung', en:'the bill'}, {de:'noch ein Bier', en:'another beer'},
      {de:'ein Glas Rotwein', en:'a glass of red wine'},
    ]},
    { frame:'Haben Sie ___?', en:'Do you have ___?', slots:[
      {de:'einen Tisch frei', en:'a table free'}, {de:'auch etwas Vegetarisches', en:'anything vegetarian'},
      {de:'eine Kinderkarte', en:'a children’s menu'}, {de:'WLAN', en:'wifi'},
    ]},
  ],
},

/* ——— 7 ——— */
{
  id: 'u7',
  title: 'Shopping & prices',
  de: 'Einkaufen und Preise',
  focus: 'Quantities, prices, and asking what things cost',
  grammar: [
    'Quantities take no "of": <i>ein Kilo Tomaten</i>, <i>dreihundert Gramm Datteln</i>, <i>ein Glas Wasser</i>. Just stack the two nouns.',
    'Prices are read as <i>zwölf Euro vierzig</i> (12,40 €). Germans write the comma as the decimal point.',
    'Numbers above twenty run backwards: <b>einundzwanzig</b> = one-and-twenty. All one word, no spaces.',
  ],
  items: [
    { id:'u7-01', de:'Wie viel kostet das?', en:'How much does that cost?', lit:'How much costs that?' },
    { id:'u7-02', de:'Was kostet alles zusammen?', en:'How much is it all together?', lit:'What costs everything together?' },
    { id:'u7-03', de:'Ich hätte gern ein Kilo Tomaten.', en:'I’d like a kilo of tomatoes.', lit:'I would-have gladly a kilo tomatoes.' },
    { id:'u7-04', de:'Dreihundert Gramm Datteln, bitte.', en:'Three hundred grams of dates, please.', lit:'Three-hundred gram dates, please.' },
    { id:'u7-05', de:'Haben Sie auch Gurken?', en:'Do you have cucumbers as well?', lit:'Have you(formal) also cucumbers?' },
    { id:'u7-06', de:'Das ist zu teuer.', en:'That is too expensive.', lit:'That is too expensive.' },
    { id:'u7-07', de:'Ich nehme das.', en:'I’ll take it.', lit:'I take that.' },
    { id:'u7-08', de:'Zahlen Sie bar oder mit Karte?', en:'Are you paying cash or by card?', lit:'Pay you(formal) cash or with card?' },
    { id:'u7-09', de:'Mit Karte, bitte.', en:'By card, please.', lit:'With card, please.' },
    { id:'u7-10', de:'Wo finde ich die Milch?', en:'Where do I find the milk?', lit:'Where find I the milk?' },
    { id:'u7-11', de:'Sonst noch etwas?', en:'Anything else?', lit:'Otherwise still something?' },
    { id:'u7-12', de:'Nein danke, das ist alles.', en:'No thanks, that’s everything.', lit:'No thanks, that is all.' },
    { id:'u7-13', de:'Der Markt ist bis achtzehn Uhr geöffnet.', en:'The market is open until six p.m.', lit:'The market is until eighteen clock opened.', note:'Opening hours use the 24-hour clock everywhere in Germany.' },
    { id:'u7-14', de:'Ich brauche noch eine Tüte.', en:'I need a bag as well.', lit:'I need still a bag.' },
    { id:'u7-15', de:'Das macht einundzwanzig Euro fünfzig.', en:'That’s twenty-one euros fifty.', lit:'That makes one-and-twenty euro fifty.' },
    { id:'u7-16', de:'Können Sie mir das einpacken?', en:'Could you wrap that up for me?', lit:'Can you(formal) to-me that in-pack?' },
  ],
  patterns: [
    { frame:'Ich hätte gern ___.', en:'I’d like ___.', slots:[
      {de:'ein Kilo Tomaten', en:'a kilo of tomatoes'}, {de:'fünf Gurken', en:'five cucumbers'},
      {de:'dreihundert Gramm Käse', en:'300 g of cheese'}, {de:'zwei Stück Kuchen', en:'two pieces of cake'},
      {de:'eine Flasche Wasser', en:'a bottle of water'},
    ]},
    { frame:'Wie viel kostet ___?', en:'How much does ___ cost?', slots:[
      {de:'das', en:'that'}, {de:'der Käse', en:'the cheese'},
      {de:'die Fahrkarte', en:'the ticket'}, {de:'alles zusammen', en:'everything together'},
    ]},
  ],
},

/* ——— 8 ——— */
{
  id: 'u8',
  title: 'Flat hunting & furniture',
  de: 'Wohnen und Möbel',
  focus: 'Where things are: the dative after in, an, auf',
  grammar: [
    'Position takes the dative: <i>Das Bett steht <b>am</b> Fenster</i> (an dem), <i>Ich wohne <b>im</b> dritten Stock</i> (in dem).',
    'German distinguishes <b>stehen</b> (stands, upright), <b>liegen</b> (lies, flat) and <b>hängen</b> (hangs). "The table is in the kitchen" is normally <i>Der Tisch <b>steht</b> in der Küche</i>.',
    'Rent comes in two numbers: <b>kalt</b> (bare rent) and <b>warm</b> (with heating and service charges). Always ask which one you are being quoted.',
  ],
  items: [
    { id:'u8-01', de:'Ich suche eine Wohnung.', en:'I am looking for a flat.', lit:'I search a flat.' },
    { id:'u8-02', de:'Die Wohnung hat drei Zimmer.', en:'The flat has three rooms.', lit:'The flat has three rooms.' },
    { id:'u8-03', de:'Wie hoch ist die Miete?', en:'How much is the rent?', lit:'How high is the rent?' },
    { id:'u8-04', de:'Die Miete ist sechshundert Euro warm.', en:'The rent is six hundred euros including bills.', lit:'The rent is six-hundred euro warm.' },
    { id:'u8-05', de:'Die Heizung ist kaputt.', en:'The heating is broken.', lit:'The heating is broken.' },
    { id:'u8-06', de:'Vielleicht haben sie ein Zimmer frei.', en:'Maybe they have a room free.', lit:'Maybe have they a room free.', note:'vielleicht first, so the verb comes second and sie moves behind it.' },
    { id:'u8-07', de:'Der Tisch ist nicht schön.', en:'The table isn’t nice.', lit:'The table is not nice.' },
    { id:'u8-08', de:'Das Bett steht am Fenster.', en:'The bed is by the window.', lit:'The bed stands at-the window.' },
    { id:'u8-09', de:'Wo ist das Bad?', en:'Where is the bathroom?', lit:'Where is the bath?' },
    { id:'u8-10', de:'Die Küche ist klein, aber hell.', en:'The kitchen is small but bright.', lit:'The kitchen is small, but bright.' },
    { id:'u8-11', de:'Ich wohne im dritten Stock.', en:'I live on the third floor.', lit:'I live in-the third floor.' },
    { id:'u8-12', de:'Kann ich die Wohnung besichtigen?', en:'Can I view the flat?', lit:'Can I the flat view?' },
    { id:'u8-13', de:'Ab wann ist die Wohnung frei?', en:'From when is the flat available?', lit:'From when is the flat free?' },
    { id:'u8-14', de:'Wir wohnen am Stadtrand.', en:'We live on the edge of town.', lit:'We live at-the city-edge.' },
    { id:'u8-15', de:'Der Schrank passt nicht ins Zimmer.', en:'The wardrobe doesn’t fit in the room.', lit:'The wardrobe fits not into-the room.' },
    { id:'u8-16', de:'Bei uns kennt jeder jeden.', en:'Where we live, everyone knows everyone.', lit:'By us knows everyone everyone(acc).' },
  ],
  patterns: [
    { frame:'Wo ist ___?', en:'Where is ___?', slots:[
      {de:'das Bad', en:'the bathroom'}, {de:'die Küche', en:'the kitchen'},
      {de:'das Schlafzimmer', en:'the bedroom'}, {de:'der Balkon', en:'the balcony'},
    ]},
    { frame:'Die Wohnung ist ___.', en:'The flat is ___.', slots:[
      {de:'klein', en:'small'}, {de:'hell', en:'bright'}, {de:'zu teuer', en:'too expensive'},
      {de:'sehr ruhig', en:'very quiet'}, {de:'renoviert', en:'renovated'},
    ]},
  ],
},

/* ——— 9 ——— */
{
  id: 'u9',
  title: 'In town & asking the way',
  de: 'In der Stadt und nach dem Weg fragen',
  focus: 'Imperatives and the separable verbs that split in half',
  grammar: [
    'Formal commands keep the Sie: <i><b>Gehen Sie</b> geradeaus.</i> The verb comes first, Sie second.',
    '<b>Separable verbs</b> break apart. <i>abbiegen</i> (to turn off) becomes <i>Biegen Sie links <b>ab</b></i> — the prefix flies to the end of the sentence.',
    'Direction vs. position: <i>Ich fahre <b>ins</b> Zentrum</i> (movement, accusative) but <i>Ich bin <b>im</b> Zentrum</i> (position, dative).',
  ],
  items: [
    { id:'u9-01', de:'Entschuldigung, wo ist der Bahnhof?', en:'Excuse me, where is the station?', lit:'Excuse, where is the station?' },
    { id:'u9-02', de:'Wie komme ich zum Hotel Königshof?', en:'How do I get to the Hotel Königshof?', lit:'How come I to-the hotel Königshof?' },
    { id:'u9-03', de:'Gehen Sie geradeaus.', en:'Go straight ahead.', lit:'Go you(formal) straight-out.' },
    { id:'u9-04', de:'Biegen Sie links ab.', en:'Turn left.', lit:'Bend you(formal) left off.', note:'abbiegen splits: ab jumps to the end.' },
    { id:'u9-05', de:'Nehmen Sie die zweite Straße rechts.', en:'Take the second street on the right.', lit:'Take you(formal) the second street right.' },
    { id:'u9-06', de:'Es ist gleich um die Ecke.', en:'It’s just round the corner.', lit:'It is right around the corner.' },
    { id:'u9-07', de:'Ist es weit von hier?', en:'Is it far from here?', lit:'Is it far from here?' },
    { id:'u9-08', de:'Fahren Sie mit der U-Bahn.', en:'Take the underground.', lit:'Drive you(formal) with the underground.' },
    { id:'u9-09', de:'Nehmen Sie den Bus Nummer fünf.', en:'Take the number five bus.', lit:'Take you(formal) the(acc.masc) bus number five.' },
    { id:'u9-10', de:'Wo kann ich eine Fahrkarte kaufen?', en:'Where can I buy a ticket?', lit:'Where can I a ticket buy?' },
    { id:'u9-11', de:'Wann fährt der nächste Zug?', en:'When does the next train leave?', lit:'When drives the next train?' },
    { id:'u9-12', de:'Ich fahre ins Zentrum.', en:'I am going into the centre.', lit:'I drive into-the centre.' },
    { id:'u9-13', de:'Ich habe mich verlaufen.', en:'I’ve got lost.', lit:'I have myself mis-walked.' },
    { id:'u9-14', de:'Können Sie mir helfen?', en:'Can you help me?', lit:'Can you(formal) to-me help?', note:'helfen always takes the dative: mir, not mich.' },
    { id:'u9-15', de:'Ich suche die Adalbert-Stifter-Straße.', en:'I’m looking for Adalbert-Stifter-Straße.', lit:'I search the Adalbert-Stifter-street.' },
    { id:'u9-16', de:'Zu Fuß sind es zehn Minuten.', en:'It’s ten minutes on foot.', lit:'To foot are it ten minutes.' },
  ],
  patterns: [
    { frame:'Wie komme ich zum ___?', en:'How do I get to the ___?', slots:[
      {de:'Bahnhof', en:'station'}, {de:'Flughafen', en:'airport'},
      {de:'Markt', en:'market'}, {de:'Hotel Königshof', en:'Hotel Königshof'},
    ]},
    { frame:'___ Sie bitte geradeaus.', en:'Please ___ straight ahead.', slots:[
      {de:'Gehen', en:'walk'}, {de:'Fahren', en:'drive'},
    ]},
  ],
},

/* ——— 10 ——— */
{
  id: 'u10',
  title: 'Clothes & sizes',
  de: 'Kleidung und Größen',
  focus: 'Dative pronouns: too big FOR ME, suits YOU',
  grammar: [
    '<b>Das ist mir zu groß</b> — "that is to-me too big". The person judging is in the dative: mir, dir, ihm, ihr, uns, Ihnen.',
    '<b>Das steht dir gut</b> = that suits you. Literally "that stands to-you well".',
    'More separable verbs: <i>anziehen</i> (put on) → <i>Ich ziehe die Jacke <b>an</b></i>; <i>ausziehen</i> (take off) → <i>Zieh die Schuhe <b>aus</b></i>.',
  ],
  items: [
    { id:'u10-01', de:'Ich brauche neue Sachen zum Anziehen.', en:'I need new things to wear.', lit:'I need new things to-the putting-on.' },
    { id:'u10-02', de:'Ich suche ein neues Hemd.', en:'I’m looking for a new shirt.', lit:'I search a new shirt.' },
    { id:'u10-03', de:'Welche Größe haben Sie?', en:'What size are you?', lit:'Which size have you(formal)?' },
    { id:'u10-04', de:'Kann ich das anprobieren?', en:'Can I try this on?', lit:'Can I that on-try?' },
    { id:'u10-05', de:'Wo ist die Umkleidekabine?', en:'Where is the changing room?', lit:'Where is the changing-cabin?' },
    { id:'u10-06', de:'Das ist mir zu groß.', en:'That’s too big for me.', lit:'That is to-me too big.' },
    { id:'u10-07', de:'Haben Sie das auch in Blau?', en:'Do you have that in blue as well?', lit:'Have you(formal) that also in blue?' },
    { id:'u10-08', de:'Die Hose passt gut.', en:'The trousers fit well.', lit:'The trousers fits well.', note:'die Hose is singular in German, even though "trousers" is plural in English.' },
    { id:'u10-09', de:'Das steht dir gut.', en:'That suits you.', lit:'That stands to-you well.' },
    { id:'u10-10', de:'Die Schuhe sind zu eng.', en:'The shoes are too tight.', lit:'The shoes are too narrow.' },
    { id:'u10-11', de:'Kann ich das umtauschen?', en:'Can I exchange this?', lit:'Can I that around-swap?' },
    { id:'u10-12', de:'Ich ziehe die Jacke an.', en:'I’m putting the jacket on.', lit:'I pull the jacket on.' },
    { id:'u10-13', de:'Du musst die Schuhe nicht ausziehen.', en:'You don’t have to take your shoes off.', lit:'You must the shoes not off-pull.', note:'müssen + nicht = don’t have to, NOT "must not". For a ban use nicht dürfen.' },
    { id:'u10-14', de:'Es ist kalt, nimm einen Mantel mit.', en:'It’s cold, take a coat with you.', lit:'It is cold, take a(acc.masc) coat with.' },
    { id:'u10-15', de:'Ich hätte gern einen Pullover in Größe M.', en:'I’d like a jumper in size M.', lit:'I would-have gladly a(acc.masc) pullover in size M.' },
    { id:'u10-16', de:'Das gefällt mir sehr.', en:'I really like that.', lit:'That pleases to-me very.', note:'gefallen flips the sentence around: the thing is the subject.' },
  ],
  patterns: [
    { frame:'Das ist mir zu ___.', en:'That is too ___ for me.', slots:[
      {de:'groß', en:'big'}, {de:'klein', en:'small'}, {de:'teuer', en:'expensive'},
      {de:'eng', en:'tight'}, {de:'lang', en:'long'},
    ]},
    { frame:'Ich suche ___.', en:'I’m looking for ___.', slots:[
      {de:'ein neues Hemd', en:'a new shirt'}, {de:'eine Jacke', en:'a jacket'},
      {de:'einen Mantel', en:'a coat'}, {de:'Schuhe in Größe 42', en:'shoes in size 42'},
    ]},
  ],
},

/* ——— 11 ——— */
{
  id: 'u11',
  title: 'Body & health',
  de: 'Körper und Gesundheit',
  focus: 'Talking about pain, and seit for something still going on',
  grammar: [
    'Two ways to say it hurts: <i>Ich habe Kopfschmerzen</i> (I have headache) or <i>Mein Kopf <b>tut weh</b></i> (my head does hurt).',
    '<b>seit</b> + present tense covers what English puts in the perfect: <i>Ich habe das <b>seit</b> drei Tagen</i> = I have had this for three days. Never use the past here.',
    'seit takes the dative: seit <b>drei Tagen</b>, seit ein<b>em</b> Jahr.',
  ],
  items: [
    { id:'u11-01', de:'Ich fühle mich nicht gut.', en:'I don’t feel well.', lit:'I feel myself not good.' },
    { id:'u11-02', de:'Ich habe Kopfschmerzen.', en:'I have a headache.', lit:'I have head-pains.' },
    { id:'u11-03', de:'Mein Fuß tut weh.', en:'My foot hurts.', lit:'My foot does hurt.' },
    { id:'u11-04', de:'Haben Sie starke Schmerzen?', en:'Are you in a lot of pain?', lit:'Have you(formal) strong pains?' },
    { id:'u11-05', de:'Seit wann haben Sie das?', en:'How long have you had this?', lit:'Since when have you(formal) that?' },
    { id:'u11-06', de:'Seit drei Tagen.', en:'For three days.', lit:'Since three days(dat).' },
    { id:'u11-07', de:'Ich möchte einen Termin beim Arzt.', en:'I would like an appointment at the doctor’s.', lit:'I would-like a(acc.masc) appointment at-the doctor.' },
    { id:'u11-08', de:'Ich bin krank.', en:'I am ill.', lit:'I am ill.' },
    { id:'u11-09', de:'Ich habe Fieber.', en:'I have a fever.', lit:'I have fever.' },
    { id:'u11-10', de:'Ich konnte zwei Tage nicht laufen.', en:'I couldn’t walk for two days.', lit:'I could two days not walk.' },
    { id:'u11-11', de:'Nehmen Sie diese Tabletten dreimal am Tag.', en:'Take these tablets three times a day.', lit:'Take you(formal) these tablets three-times on-the day.' },
    { id:'u11-12', de:'Gute Besserung!', en:'Get well soon!', lit:'Good improvement!' },
    { id:'u11-13', de:'Ich brauche ein Rezept.', en:'I need a prescription.', lit:'I need a prescription.' },
    { id:'u11-14', de:'Wo ist die nächste Apotheke?', en:'Where is the nearest pharmacy?', lit:'Where is the nearest pharmacy?' },
    { id:'u11-15', de:'Der Fuß sieht nicht gut aus.', en:'The foot doesn’t look good.', lit:'The foot sees not good out.', note:'aussehen (to look/appear) splits: aus goes to the end.' },
    { id:'u11-16', de:'Ich muss zum Arzt gehen.', en:'I have to go to the doctor.', lit:'I must to-the doctor go.' },
  ],
  patterns: [
    { frame:'Ich habe ___.', en:'I have ___.', slots:[
      {de:'Kopfschmerzen', en:'a headache'}, {de:'Bauchschmerzen', en:'a stomach ache'},
      {de:'Halsschmerzen', en:'a sore throat'}, {de:'Rückenschmerzen', en:'back pain'},
      {de:'Fieber', en:'a fever'},
    ]},
    { frame:'Seit ___.', en:'For ___.', slots:[
      {de:'drei Tagen', en:'three days'}, {de:'einer Woche', en:'a week'},
      {de:'zwei Monaten', en:'two months'}, {de:'gestern', en:'yesterday'},
    ]},
  ],
},

/* ——— 12 ——— */
{
  id: 'u12',
  title: 'Talking about the past',
  de: 'Über die Vergangenheit sprechen',
  focus: 'The Perfekt, and the haben/sein split',
  grammar: [
    'Spoken German tells the past with the <b>Perfekt</b>: helper verb in second position, past participle at the very end. <i>Ich <b>habe</b> viele Fotos <b>gemacht</b>.</i>',
    'Most verbs take <b>haben</b>. Verbs of movement and change of state take <b>sein</b>: <i>Ich <b>bin</b> nach München <b>gefahren</b>.</i>',
    'Two verbs break the rule and stay in the simple past even in speech: <b>war</b> (was) and <b>hatte</b> (had). Nobody says "Ich bin gewesen" in casual conversation.',
  ],
  items: [
    { id:'u12-01', de:'Was hast du am Wochenende gemacht?', en:'What did you do at the weekend?', lit:'What have you on-the weekend done?' },
    { id:'u12-02', de:'Ich war in Berlin.', en:'I was in Berlin.', lit:'I was in Berlin.' },
    { id:'u12-03', de:'Wir waren sogar am Brandenburger Tor.', en:'We even went to the Brandenburg Gate.', lit:'We were even at-the Brandenburg gate.' },
    { id:'u12-04', de:'Ich habe viele Fotos gemacht.', en:'I took a lot of photos.', lit:'I have many photos made.' },
    { id:'u12-05', de:'Wir haben in einem Hotel übernachtet.', en:'We stayed overnight in a hotel.', lit:'We have in a hotel over-nighted.' },
    { id:'u12-06', de:'Warst du schon mal in Schweden?', en:'Have you ever been to Sweden?', lit:'Were you already once in Sweden?' },
    { id:'u12-07', de:'Ich vermisse den Strand jetzt schon.', en:'I already miss the beach.', lit:'I miss the(acc.masc) beach now already.' },
    { id:'u12-08', de:'Wir sind nach München gefahren.', en:'We went to Munich.', lit:'We are to Munich driven.', note:'Movement → sein, not haben.' },
    { id:'u12-09', de:'Ich habe gestern lange geschlafen.', en:'I slept a long time yesterday.', lit:'I have yesterday long slept.' },
    { id:'u12-10', de:'Hast du gut geschlafen?', en:'Did you sleep well?', lit:'Have you well slept?' },
    { id:'u12-11', de:'Ich bin gestern gut angekommen.', en:'I arrived safely yesterday.', lit:'I am yesterday well arrived.' },
    { id:'u12-12', de:'Es hat viel Spaß gemacht.', en:'It was a lot of fun.', lit:'It has much fun made.' },
    { id:'u12-13', de:'Ich habe meine Tasche vergessen.', en:'I forgot my bag.', lit:'I have my bag forgotten.' },
    { id:'u12-14', de:'Wie war dein Urlaub?', en:'How was your holiday?', lit:'How was your holiday?' },
    { id:'u12-15', de:'Ich hatte leider keine Zeit.', en:'Unfortunately I didn’t have time.', lit:'I had unfortunately no time.' },
    { id:'u12-16', de:'Wir haben viel gesehen und wenig geschlafen.', en:'We saw a lot and slept little.', lit:'We have much seen and little slept.' },
  ],
  patterns: [
    { frame:'Ich habe ___ gemacht.', en:'I did / made ___.', slots:[
      {de:'viele Fotos', en:'lots of photos'}, {de:'einen Ausflug', en:'a day trip'},
      {de:'nichts', en:'nothing'}, {de:'eine Pause', en:'a break'},
    ]},
    { frame:'Ich bin nach ___ gefahren.', en:'I went to ___.', slots:[
      {de:'München', en:'Munich'}, {de:'Berlin', en:'Berlin'},
      {de:'Hause', en:'home'}, {de:'Schweden', en:'Sweden'},
    ]},
  ],
},

];

/* 展平成一份索引：排程器只認 id，UI 才需要知道單元。 */
const ITEMS = [];
const ITEM_BY_ID = new Map();
for (const unit of COURSE) {
  for (const it of unit.items) {
    const item = Object.assign({ unitId: unit.id, unitTitle: unit.title, kind: 'sentence' }, it);
    ITEMS.push(item);
    ITEM_BY_ID.set(item.id, item);
  }
  /* 替換練習展開成獨立題目，才進得了間隔重複的排程 */
  unit.patterns.forEach((p, pi) => {
    p.slots.forEach((s, si) => {
      const item = {
        id: `${unit.id}-p${pi + 1}-${si + 1}`,
        unitId: unit.id,
        unitTitle: unit.title,
        kind: 'pattern',
        de: p.frame.replace('___', s.de),
        en: p.en.replace('___', s.en),
        lit: '',
        frame: p.frame,
        slot: s.de,
      };
      ITEMS.push(item);
      ITEM_BY_ID.set(item.id, item);
    });
  });
}

window.NochmalCourse = { COURSE, ITEMS, ITEM_BY_ID };
})();
