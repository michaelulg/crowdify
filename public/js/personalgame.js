var lemmatize = require( 'wink-lemmatizer' );
var Typo = require("typo-js");
var dictionary = new Typo('en_US');
var thesaurus = require("thesaurus");
var neo4j = require('neo4j-driver'); // .v1

const max_chooses = 100; // the #chooses from each song before refresh 
const spam_punishment = -2; // the score punishment for adding spam relation 
const contribution_reward = 1; // the score revard for contribution of a new relation
const spam_limit = max_chooses/10; // the minimal value of the 'new_weight' filed of 
                                 // song-to-word relation to be not classified as spam
const user_spam_limit = 0 // the minimal SCORE for user to be considered as not spammer
const superusers = 3; // the amount of superusers
const stop_words = ["i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
					"yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
					"her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
				    "theirs", "themselves", "what", "which", "who", "whom", "this", "that", 
					"these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
					"have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
					"the", "and", "but", "if", "or", "because", "as", "until", "while", "of", 
					"at", "by", "for", "with", "about", "against", "between", "into", "through", 
					"during", "before", "after", "above", "below", "to", "from", "up", "down",
					"in", "out", "on", "off", "over", "under", "again", "further", "then", "once", 
					"here", "there", "when", "where", "why", "how", "all", "any", "both", "each", 
					"few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", 
					"same", "so", "than", "too", "very", "can", "will", "just", "should", "now"]

//===================== Additional Functions ======================

// Run General Query and returns the result

async function run_query(query, mesg){

    var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'lion2192'));
	let session = driver.session();
	let answer;

    await session
		.run(query)
		.then(function(result){
			answer = result;
			console.log(mesg);
		})
		.catch(function(err){
			console.log(err);
		});

	await session.close();
	await driver.close();
	return answer;
}

//-----------------------------------------------------------------

// Register New User

async function create_user(userID, username){

	let query = 'CREATE (u:User {userID:"' + userID + '", username:"' + username + '", score:0 })'; // init SCORE to zero
	let mesg = '-Register the user ' + username + '!';
	return await run_query(query, mesg);
}

//-----------------------------------------------------------------

// Check if user exists
// Return 1 = Yes

async function check_user(userID, username){

	// check if the user exists
	let query = `MATCH (u:User {userID:"` + userID + `"})
	             RETURN u`;
	let mesg = '-Check if user ' + userID + ' exists:';
	let ans = await run_query(query, mesg);

	if(ans.records.length == 0){
		// user does not exists
		console.log("\x1b[31m%s\x1b[0m", '-> No.');
		return 0;
	}

	else{
		// word exists
		console.log("\x1b[32m%s\x1b[0m", '-> Yes.');
		return 1;
	}
}

//-----------------------------------------------------------------

// Check if the given user exists and creates it if not

async function verify_user(userID, username){

	if(await check_user(userID, username) == 0){
		// user does not exists
		await create_user(userID, username);
	}
}

//-----------------------------------------------------------------

// Create vertex for the given word

async function create_word(word){

	query = `CREATE (w:Word {name:"` + word + `"})`;
	mesg = '-Create the word,';
	await run_query(query, mesg);
}

//-----------------------------------------------------------------

// Check if the word exists
// Return 1 = Yes

async function check_word(word){

	// check if the word exists
	let query = `MATCH (w:Word {name:"` + word + `"})
	             RETURN w`;
	let mesg = '-Check if word ' + word + ' exists:';
	let ans = await run_query(query, mesg);

	if(ans.records.length == 0){
		// word does not exists
		console.log("\x1b[31m%s\x1b[0m", '-> No.');
		return 0;
	}

	else{
		// word exists
		console.log("\x1b[32m%s\x1b[0m", '-> Yes.');
		return 1;
	}
}

//-----------------------------------------------------------------

// Check if the given word exists and creates it if not

async function verify_word(word){

	if(await check_word(word) == 0){
		// word does not exists
		await create_word(word);
	}
}

//-----------------------------------------------------------------

// Add new song

async function create_song(name, songID, views) {
	let query = `CREATE (s:Song {name: "` + name + `", songID: "` + songID + `", chooses:0, views: ` + views + `})`
	let mesg = 'Create the song: ' + name + '.';
	await run_query(query, mesg);
	return 0;
}

//-----------------------------------------------------------------

// Check if the given song exists 
// Return 1 = Yes 

async function check_song(songID, name, views){

	// check if the song exists
	let query = `MATCH (s:Song {songID:"` + songID + `"})
	             RETURN s`;
	let mesg = '-Check if song ' + songID + ' exists:';
	let ans = await run_query(query, mesg);

	if(ans.records.length == 0){
		// song does not exists
		console.log("\x1b[31m%s\x1b[0m", '-> No.');
		return 0;
	}

	else{
		// song exists
		console.log("\x1b[32m%s\x1b[0m", '-> Yes.');
		return 1;
	}
}

//-----------------------------------------------------------------

// Check if the given song exists and creates it if not

async function verify_song(songID, name, views){

	if(await check_song(songID, name, views) == 0){ 
		// song does not exists
		await create_song(name, songID, views);
	}
}

//-----------------------------------------------------------------

// Check if user is a spammer 

async function check_spammer(userID){

	let query = `MATCH (u:User {userID:"` + userID + `"})
				 RETURN u.score`;
	let mesg = '-Check if user ' + userID + ' is considered as spammer';
	let ans = await run_query(query, mesg);

	let tmp = Object.values(ans.records[0]._fields[0])[0];

	if(tmp < user_spam_limit){
		console.log("\x1b[32m%s\x1b[0m", '-> Yes.');
		return 0;
	}

	else{
		console.log("\x1b[31m%s\x1b[0m", '-> No.');
		return 1;
	}
}

//-----------------------------------------------------------------

// Checks if the user is tring to choose / add the same WORD multiple times.
// Return -1 if he does and 0 otherwise.

async function check_duplication(userID, songID, word){

	let query = 'MATCH (s:Song {songID:"' + songID + `"}) 
				 OPTIONAL MATCH (s)<-[l:u_TO_s]-(u)
				 WHERE u.userID = "` + userID + `"
				 AND l.word_name = "` + word + `"
				 RETURN l`;
	let mesg = '-Check if user ' + userID + ' already choose the word "' + word + '" from song ' + songID;
	let ans = await run_query(query, mesg);

	if(ans.records[0]._fields[0] == null){
		console.log("\x1b[31m%s\x1b[0m", "-> No.");
		return 0;
	}

	else{
		console.log("\x1b[32m%s\x1b[0m", "-> Yes.");
		return -1;
	}
}

//-----------------------------------------------------------------

// Add u_TO_s edge and updates user's SCORE

async function add_user_to_song_relation(userID, songID, word){

	let query = 'MATCH (s:Song {songID:"' + songID + `"}), (u:User {userID: "` + userID + `"})
				 MERGE (u)-[l:u_TO_s {word_name:"` + word +`"}]->(s)
				 SET u.score = u.score + ` + contribution_reward;
	let mesg = '-Add user ' + userID + ' to the relation beetwen song ' + songID + ' and word "' + word + `". \n-Increase SCORE filed of user ` + userID + '.';
	await run_query(query, mesg);
}

//-----------------------------------------------------------------

// Updates the NEW WEIGHT field of song-word relation by adding one.
// Calls update_chooses() to increase #chooses by one

async function choose_relation(songID, word){

	let query = 'MATCH (s:Song {songID:"' + songID + `"})
				 OPTIONAL MATCH (s)-[l:s_TO_w]->(w)
				 WHERE w.name = "` + word + `" 
				 SET l.new_weight = l.new_weight + 1`;
    let mesg = '-Increase NEW_WEIGHT field of the relation beetwen song ' + songID + ' and word "' + word + '".';
    await run_query(query, mesg);

    await update_chooses(songID);
}

//-----------------------------------------------------------------

// This function refresh the song-to-word relations from particular song.
// It removes the song-to-word relations that looks like spam. 
// This function should be colled every constant number of 
// user chooses from the given song.

async function refresh(songID) {

	console.log("-Refresh song " + songID + ":");

	// delete all the song-to-word relations that 
	// looks like spam. Also punish the users who 
	// added the spam relations. 
	let query = `MATCH (s:Song {songID:"` + songID + `"})
				 OPTIONAL MATCH (u)-[l1:u_TO_s]->(s)-[l2:s_TO_w]->(w)
				 WHERE l2.weight > 0 
				 AND l2.new_weight < ` + spam_limit + `
				 AND l1.word_name = w.name
				 DELETE l1, l2
				 SET u.score = u.score + ` + spam_punishment;
	let mesg = '   -Deleted all spam-classified song-word relations,';
	await run_query(query, mesg);

    // refresh the left song-to-word relations
	// set weight -> new weight and new weight -> 0
	query = `MATCH (s:Song {songID:"` + songID + `"})
			 OPTIONAL MATCH (s)-[l:s_TO_w]->(w)
			 SET l.weight = l.new_weight
			 SET l.new_weight = 0`;
	mesg = '   -Refreshed all song-to-word relations,';
	await run_query(query, mesg);

	// set 'chooses' to zero
	query = 'MATCH (s:Song {songID:"' + songID + `"})
			 SET s.chooses = 0`;
	mesg = '   -Set CHOOSES to be zero.';
	await run_query(query, mesg);
}

//-----------------------------------------------------------------

// Updates the 'CHOOSES' parameter by adding one.
// If nedded, calls the refresh() function.

async function update_chooses(songID) {
	let query = 'MATCH (s:Song {songID:"' + songID + `"})
				 SET s.chooses = s.chooses + 1
				 RETURN s.chooses`;
	let mesg = '-Increase CHOOSES field of song ' + songID + '.';
	let ans = await run_query(query, mesg);

	if(Object.values(ans.records[0]._fields[0])[0] == max_chooses)
		await refresh(songID);
}

//-----------------------------------------------------------------

// Check if the given WORD exists and connected to the SONG. 
// Do it if not.

async function verify_connection(songID, word) {

	// check if the word is connected to the song 
	query = 'MATCH (s:Song {songID:"' + songID + `"}) 
				OPTIONAL MATCH (s)-[l:s_TO_w]->(w)
				WHERE w.name ="` + word + `" 
				RETURN l`;
	mesg = '-Check if the word ' + word + ' is connected to the song ' + songID + ':';
	ans = await run_query(query, mesg); 

	if(ans.records[0]._fields[0] == null){

		// if not connected -> connect
		console.log("\x1b[31m%s\x1b[0m", '-> No.');

		query = 'MATCH (s:Song {songID:"' + songID + `"}), (w:Word {name:"` + word + `"})
					MERGE (s)-[l:s_TO_w {weight:0, new_weight:0}]->(w)`;
		mesg = '-Connect the word to the song.';
		await run_query(query, mesg); 
	}

	else{
		// word connected  
		console.log("\x1b[32m%s\x1b[0m", '-> Yes.');
	}
}

//======================== First Game =============================

// Game Button:
// When the game button is pressed, this function returns
// the list of 5 (or less) words that we offer to the user (In 
// addition to the option to add a word). The words will 
// be arranged in the order in which they would appear
// in the site.

async function get_offers(songID, name, views){

	console.log("\x1b[35m%s\x1b[0m", '\nGet offers for availble words to choose from song ' + songID + ':');

	await verify_song(songID, name.toLowerCase(), views);

	let words = []; // [{name: 'eminem', weight: 34}, {name: 'bebe', weight: 17}, ... ]

	let query = 'MATCH (s:Song {songID:"' + songID + `"}) 
				 OPTIONAL MATCH (s)-[l:s_TO_w]->(w)
				 RETURN w.name, l.weight
				 ORDER BY l.weight DESC`;
	let mesg = '-Extract the words related to song ' + songID + '.';
	let ans = await run_query(query, mesg);

	ans.records.forEach(function(record){
		if(record._fields[0] != null){
			words.push(record._fields[0]);
		}
	});

	let len = words.length;
	if(len > 4){
		return (words.slice(0,3)).concat(words.slice(len-2, len));
	}
	else if(len == 4){
		return (words.slice(0,3)).concat(words.slice(len-1, len));
	}
	return words;
}

//-----------------------------------------------------------------

// User Selects a Word From Our Suggestions:
// When user presses on one of the suggested words, 
// this function will run all the needed checks and 
// update the data base

async function choose_word(userID, songID, word, flag = 1){

	//console.log("\x1b[35m%s\x1b[0m", '\nUser ' + userID + ' want to choose the word "' + word + '" for song ' + songID + ':');

	// check if the user already choose / add this word 
	if(await check_duplication(userID, songID, word) < 0){
		console.log("\x1b[33m%s\x1b[0m", '-> Operation aborted: \n   User cant add twice same song-word relation.');
	}

	else{
		// add the u_TO_s edge (from the user to the song)
		// and increases its SCORE by 'contribution_reward'
		await add_user_to_song_relation(userID, songID, word);

		// the above steps effect only the user. The next steps
		// would effect our search mechanisem and as so should
		// be done only if the user isn't classified as spammer

		if(flag){

			// this function would update the weight of the 
			// choosen relation, then it will call to a 
			// function that will increase the #chooses 
			// field of the song, finnaly it will call 
			// a function that refresh all the relations 
			// from the song if needed
			await choose_relation(songID, word);
			console.log("\x1b[33m%s\x1b[0m", '-> Successfully completed.');
		}

		else
			console.log("\x1b[33m%s\x1b[0m", '-> Operation partily aborted: \n   Spam protection.');
	}
}  

//-----------------------------------------------------------------

// User Add New Word:
// When user presses on the ADD NEW button, 
// this function will run all the needed checks and 
// update the data base

async function add_word(userID, username, songID, name, views, word){

	console.log("\x1b[35m%s\x1b[0m", '\nUser ' + userID + ' want to add the word "' + word.toLowerCase() + '" for song ' + songID + ':');
	
	await verify_user(userID, username.toLowerCase());
	await verify_song(songID, name.toLowerCase(), views);
	let lem_word = await lemmatize_word(word.toLowerCase());

	// we allow to add a word only for not spammers
	if(await check_spammer(userID)){

		// the next functions verifies that the
		// word that the user wants to add exsists and 
		// connected to the song (by s_TO_w relation).
		// If it returns -1 then the user tries to add 
		// a word that he already choose / add
		await verify_word(lem_word);
		await verify_connection(songID, lem_word);
		
		// now we can simply choose the word
		await choose_word(userID, songID, lem_word);
	}

	// if the user is spammer then we allow to
	// choose word only if it already exists
	else if(await check_word(lem_word)){
		await choose_word(userID, songID, lem_word, 0);
	}

	else{
		console.log("\x1b[33m%s\x1b[0m", '-> Operation aborted: \n   Spammers cant add new words');
	}
}

//-----------------------------------------------------------------

// This function return list of superusers and their SCOREs:
// [{ username: 'Ben', score: 74 }, { username: 'Ron', score: 34 }, ...]

async function get_superusers(){

	let res = [];

	console.log("\x1b[35m%s\x1b[0m", '\nGet super users:');

	let query = `MATCH (u:User)
				 RETURN u.username, u.score
				 ORDER BY u.score DESC
				 LIMIT ` + superusers;
	let mesg = '-Extract super users + thier SCOREs'
	let ans = await run_query(query, mesg);

	ans.records.forEach(function(record){
		res.push({
			username: record._fields[0],
			score: Object.values(record._fields[1])[0]
		});
	});

	return res;
}

//========================== Second Game ==========================

// Return a list of the 10 most popular songs

async function popular_songs(){
	let query = `MATCH (s:Song)
				 RETURN s.songID
				 ORDER BY s.views DESC
				 LIMIT 10`;
	let mesg = '-Extract the most popular songs'
	let ans = await run_query(query, mesg);

	let res = [];
	ans.records.forEach(function(record){
		res.push(record._fields[0]);
	});

	return res;
}

//-----------------------------------------------------------------

async function get_weight(songID, word){
	let query = `MATCH (s:Song {songID: "` + songID + `"})
				 OPTIONAL MATCH (s)-[l:s_TO_w]->(w)
				 WHERE w.name = "` + word + `"
				 UNWIND [l.weight, l.new_weight] AS tmp
				 RETURN max(tmp)`;
	let mesg = '-Extract MAX(weight, new_weight) of "' + songID + '-' + word + '" song-word relation.';
	let ans = await run_query(query, mesg);

	return ans.records[0]._fields[0]["low"];
}

//========================= Search Engine =========================

// Returns a list of similar words

async function synonyms(word){
	console.log('-Extract synonyms for the word "' + word + '".');
	return thesaurus.find(word);
}

//-----------------------------------------------------------------

// Return the lemmatized form of the word

async function lemmatize_word(word){
	let ans;
	ans = lemmatize.adjective(word);
	ans = lemmatize.noun(ans);
	ans = lemmatize.verb(ans);
	console.log('-Lemmatize: ' + word + ' --> ' + ans + '.');
	return ans
}

//-----------------------------------------------------------------

// Return ordered list of songs

async function search(string){
	console.log("\x1b[35m%s\x1b[0m", '\nSearch for the song"' + string + '":');
	let song_dict = {}; // { songID: relation_strength, ... }

	// all to lower case -> split by spaces
	let tmp = string.toLowerCase(); 
	let words = tmp.split(" ");

	// remove all stop words
	tmp = [];
	let len = words.length;
	for(i=0; i<len; i++){
		if(!stop_words.includes(words[i])){
			tmp.push(words[i]);
		}
	}
	words = tmp;

	// lemmatize -> find synonyms -> add to 'words'
	len = words.length;
	for(i=0; i<len; i++){
		words[i] = await lemmatize_word(words[i]); 
		tmp = await synonyms(words[i]);
		tmp = tmp.slice(0,3);
		for(j=0; j<tmp.length; j++){
			words.push(tmp[j]);
		}
	}
	
	// search song titles that included in 'words'
	console.log('-Search songs with titles that contains:');
	len = words.length;
	let title;
	for(i=0; i<len; i++){
		title = words[i];
		let query = `MATCH (s:Song)
					 WHERE s.name CONTAINS "` + title + `"
					 RETURN s.songID, s.views`;
		let mesg = '  -> "' + title + `"`;
		ans = await run_query(query, mesg);

		//add the found songs to the song_dict
		ans.records.forEach(function(record){
			song_dict[record._fields[0]] = record._fields[1]['low'];
		});
	}

	// search words that included in 'words'
	console.log('-Search songs related to words that contain:');
	for(i=0; i<len; i++){
		title = words[i];
		query = `MATCH (w:Word)
				 WHERE w.name CONTAINS "` + title + `"
				 OPTIONAL MATCH (w)<-[l:s_TO_w]-(s)
				 UNWIND [s.views*l.weight, s.views*l.new_weight] AS tmp
				 RETURN s.songID, max(tmp) AS strength`;
		mesg = '  -> "' + title + '"';
		ans = await run_query(query, mesg);

		//add the found songs to the song_dict
		ans.records.forEach(function(record){
			if(song_dict[record._fields[0]] == null){
				song_dict[record._fields[0]] = record._fields[1]['low']/max_chooses;
			} 
			else{
				song_dict[record._fields[0]] += record._fields[1]['low']/max_chooses;
			}
		});
	}

	// reconstract song_dict
	tmp = [];
	results = [];
	for(var key in song_dict){
		tmp.push({
			songID: key,
			strength: song_dict[key]
		});
	}

	// sort song_dict by strength
	tmp.sort((a, b) => (a.strength > b.strength) ? -1 : 1);

	// cleanly rewrite the results 
	tmp.forEach(function(elem){
		results.push(elem.songID);
	});
	
	return results;
}

//========================= Autocorrect ===========================

async function autocorrect(word){
	console.log("\x1b[35m%s\x1b[0m", '\nExtract autocorrect suggestens for the word "' + word + '".');
	return dictionary.suggest(word);
}

//========================= Init Data Base ========================

async function init_exp(){
	// add_word: ( userID, username, songID, name, views, word )
	await add_word("1", "The Creator", "1", "crazy", 3243824, "ninet");
	await add_word("1", "The Creator", "1", "crazy", 3243824, "crazy");
	await add_word("1", "The Creator", "2", "The Ocean", 158943245, "Mike Perry");
	await add_word("1", "The Creator", "2", "The Ocean ", 158943245, "Shy Martin");
	await add_word("1", "The Creator", "2", "The Ocean ", 158943245, "dive");
	await add_word("1", "The Creator", "2", "The Ocean ", 158943245, "ocean");
	await add_word("1", "The Creator", "3", "Am I Wrong", 495844979, "Nico");
	await add_word("1", "The Creator", "5", "R.I.O", 609895, "Nico");
	await add_word("1", "The Creator", "0", "Waka Waka", 2842385500, "Shakira");
	await add_word("1", "The Creator", "2", "The Ocean", 158943245, "deep");
	await add_word("1", "The Creator", "5", "R.I.O", 609895, "Party Shaker");
	await add_word("1", "The Creator", "6", "Stereo Hearts", 550422993, "Gym Class Heroes");
	await add_word("1", "The Creator", "6", "Stereo Hearts", 550422993, "Adam Levine");
	await add_word("1", "The Creator", "6", "Stereo Hearts", 550422993, "sterio");
	await add_word("1", "The Creator", "7", "Alien", 11343207, "around we go");
	await add_word("1", "The Creator", "7", "Alien", 11343207, "filling like an alien");
}

//============================= Test ==============================

async function Test(){
	//await init_exp();
	//console.log(await search("we around"));
	//console.log(await get_offers(5, "crazy", 2001));
	//console.log(await popular_songs());
	//console.log(await get_weight("1", "ninet"));
}

// Test().then(function(result){
// 	console.log('\nDone test.\n'); 
// });

module.exports.get_offers = get_offers;
module.exports.add_word = add_word;
module.exports.search = search;
module.exports.popular_songs = popular_songs;
module.exports.get_weight = get_weight;






