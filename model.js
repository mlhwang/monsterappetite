////////// Shared code (client and server) //////////

Games = new Mongo.Collection('games');
// { board: ['A','I',...], clock: 60,
//   players: [{player_id, name}], winners: [player_id] }

Words = new Mongo.Collection('words');
// {player_id: 10, game_id: 123, word: 'hello', state: 'good', score: 4}

Players = new Mongo.Collection('players');
// {name: 'matt', game_id: 123}

// 6 faces per die, 16 dice.  Q really means Qu.
//
//
// 16 dice with 6 faces will result in 96 food items in total (I have 99 items in total)
// What is an efficient way to declare each die that has 6 sides of different food items?
var DECK = [{card_name:'hamburger',calories:300},
            {card_name:'pizza', calories:500},
            {card_name:'chips',calories:600},
            {card_name:'chocolate',calories:140},
            {card_name:'icecream',calories:240},
            {card_name:'popsicle',calories:100},
            

            {card_name:'salsa',calories:10},
            {card_name:'smuckers',calories:50},
            {card_name:'hersheys',calories:60},
            {card_name:'lays_dip',calories:60},
            {card_name:'popcorn',calories:80},
            {card_name:'caramel',calories:170},
            {card_name:'butterfinger_stixx',calories:90},
            {card_name:'cheezwhiz',calories:90},
            {card_name:'fudgesicle',calories:100},
            {card_name:'klondike',calories:100},
            {card_name:'chocolate_IC',calories:100},
            {card_name:'hummus',calories:35},
            {card_name:'nutrigrain_nuts',calories:140},
            {card_name:'soycrisps_cheddar',calories:120},
            {card_name:'ritz_sourcream',calories:130},
            {card_name:'pumpernickel_pretzels',calories:130},
            {card_name:'goldencrisp',calories:147},
            {card_name:'nutrigrain_rasberry',calories:140},
            {card_name:'almondcrisps',calories:140},
            {card_name:'honey_cheerios',calories:160},
            {card_name:'breyers_ICsandwich',calories:160},
            {card_name:'rye_chips',calories:160},
            {card_name:'reeses_puffs_cereal',calories:160},
            {card_name:'hostess_cupcake',calories:180},
            {card_name:'hostess_suzyQ',calories:220},
            {card_name:'m&m_ICsandwich',calories:220},
            {card_name:'reeses_bigcup',calories:230},
            {card_name:'strawberry_shortcake',calories:240}, 
            {card_name:'butterfinger',calories:270}, 
            {card_name:'twix_PB',calories:280}, 
            {card_name:'brownies',calories:280}, 
            {card_name:'haagendazs_vanilla',calories:290}, 
            {card_name:'whitecastle_CB',calories:310}, 
            {card_name:'nestle_drumstick',calories:360}, 
            {card_name:'quakes_rice_snacks',calories:140}, 
            {card_name:'redhots',calories:120}, 
            {card_name:'ruffles_cheddar',calories:160}, 
            {card_name:'snyders_pretzel',calories:100}, 
            {card_name:'stacys_pitachips_parmesan',calories:140}, 
            {card_name:'thousand_island',calories:140}, 
            {card_name:'tollhouse_ICsandwich',calories:499}, 
            {card_name:'smartfood_whitecheddar',calories:160}, 
            {card_name:'soda',calories:250},  
            ];

var DICTIONARY = null;

// board is an array of length 16, in row-major order.  ADJACENCIES
// lists the board positions adjacent to each board position.
//
//
// THIS variable probably can go away as there will be NO sequence of items being chosen
/*var ADJACENCIES = [
  [1,4,5],
  [0,2,4,5,6],
  [1,3,5,6,7],
  [2,6,7],
  [0,1,5,8,9],
  [0,1,2,4,6,8,9,10],
  [1,2,3,5,7,9,10,11],
  [2,3,6,10,11],
  [4,5,9,12,13],
  [4,5,6,8,10,12,13,14],
  [5,6,7,9,11,13,14,15],
  [6,7,10,14,15],
  [8,9,13],
  [8,9,10,12,14],
  [9,10,11,13,15],
  [10,11,14]
];*/

// generate a new random selection of letters.
new_board = function () {
  var board = [];
  var i;

  // pick random letter from each die
  for (i = 0; i < 16; i += 1) {
    board[i] = Random.choice(DECK);
  }

  // knuth shuffle
  //pretty sure uneeded now, doesnt hurt tho
  for (i = 15; i > 0; i -= 1) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = board[i];
    board[i] = board[j];
    board[j] = tmp;
  }

  return board;
};

// returns an array of valid paths to make the specified word on the
// board.  each path is an array of board positions 0-15.  a valid
// path can use each position only once, and each position must be
// adjacent to the previous position.
paths_for_word = function (board, word) {
  var valid_paths = [];

  var check_path = function (word, path, positions_to_try) {
    // base case: the whole word has been consumed.  path is valid.
    if (word.length === 0) {
      valid_paths.push(path);
      return;
    }

    // otherwise, try to match each available position against the
    // first letter of the word, avoiding any positions that are
    // already used by the path.  for each of those matches, descend
    // recursively, passing the remainder of the word, the accumulated
    // path, and the positions adjacent to the match.

    for (var i = 0; i < positions_to_try.length; i++) {
      var pos = positions_to_try[i];
      if (board[pos] === word[0] && _.indexOf(path, pos) === -1)
        check_path(word.slice(1),      // cdr of word
                   path.concat([pos]), // append matching loc to path
                   ADJACENCIES[pos]);  // only look at surrounding tiles
    }
  };

  // start recursive search w/ full word, empty path, and all tiles
  // available for the first letter.
  check_path(word, [], [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);

  return valid_paths;
};

Meteor.methods({
    score_card: function (card_name) {
    //find card name in DECK and get score
    /*for (var i = DECK.length - 1; i >= 0; i--) {
      if(DECK[i].card_name == card_name){
        return DECK[i].calories;
      }
    };*/

    /*if (game.clock === 0){
      return;
    }
    var card = Words.findOne(card_id);

    Words.update(card._id, {$set: {score: score, state: 'good'}});
    */

  },
  score_word: function (word_id) {
    check(word_id, String);
    var word = Words.findOne(word_id);
    var game = Games.findOne(word.game_id);

    // client and server can both check that the game has time remaining, and
    // that the word is at least three chars, isn't already used, and is
    // possible to make on the board.
    if (game.clock === 0
        || !word.word
        || word.word.length < 3
        || Words.find({game_id: word.game_id, word: word.word}).count() > 1
        || paths_for_word(game.board, word.word).length === 0) {
      Words.update(word._id, {$set: {score: 0, state: 'bad'}});
      return;
    }

    // now only on the server, check against dictionary and score it.
    if (Meteor.isServer) {
      if (_.has(DICTIONARY, word.word.toLowerCase())) {
        var score = Math.pow(2, word.word.length - 3);
        Words.update(word._id, {$set: {score: score, state: 'good'}});
      } else {
        Words.update(word._id, {$set: {score: 0, state: 'bad'}});
      }
    }
  }
});


if (Meteor.isServer) {
  DICTIONARY = {};
  _.each(Assets.getText("enable2k.txt").split("\n"), function (line) {
    // Skip blanks and comment lines
    if (line && line.indexOf("//") !== 0) {
      DICTIONARY[line] = true;
    }
  });

  // publish all the non-idle players.
  Meteor.publish('players', function () {
    return Players.find({idle: false});
  });

  // publish single games
  Meteor.publish('games', function (id) {
    check(id, String);
    return Games.find({_id: id});
  });

  // publish all my words and opponents' words that the server has
  // scored as good.
  Meteor.publish('words', function (game_id, player_id) {
    check(game_id, String);
    check(player_id, String);
    return Words.find({$or: [{game_id: game_id, state: 'good'},
                             {player_id: player_id}]});
  });
}
