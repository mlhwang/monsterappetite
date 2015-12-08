////////// Main client application logic //////////

//////
////// LOBBY template: shows everyone not currently playing, and
////// offers a button to start a fresh game.
//////
Router.route('/game',{
  template: 'page'
});

Router.configure({
    layoutTemplate: 'main'
});


Template.lobby.helpers ({

  show: function () {
    // only show lobby if we're not in a game
    var me = player();
    return !game(me);
  },
  
  waiting : function () {
    var players = Players.find({_id: {$eq: Session.get('player_id')},
                                game_id: {$exists: false}});
    return players;
  },

  count : function () { 
    //$ne selects the documents where the value of the field is NOT EQUAL (i.e. !=) to the specified value. 
    //This includes documents that do not contain the field.
    var players = Players.find({_id: {$ne: Session.get('player_id')},
                                name: {$ne: ''},
                                game_id: {$exists: false}});
    return players.count();
  },

  disabled : function () {
    var me = player();
    if (me && me.name)
      return '';
    return 'disabled';
  },

  username : function (){
    var me = player();
    if(me)
      return me.name;
    else{
      return ""
    }
  } 

});


var trim = function (string) { return string.replace(/^\s+|\s+$/g, ''); };

Template.lobby.events({
  'keyup input#myname': function (evt) {
    var name = trim($('#lobby input#myname').val());
    Players.update(Session.get('player_id'), {$set: {name: name}});
  },
  'click button.startgame': function () {
    var me = player();
    //////////////////////////////////// START NEW GAME method is called //////////////////////////////////
    Meteor.call('start_new_game', me._id, function (error, result) {
      if (error) {
      // handle error
      //console.error("you have made a mistake");
      }  else {
      //////////////////////////////////// NEW ROUND method is called //////////////////////////////////
      //console.log("starting a new round");
      Meteor.call('new_round',player(),result);
      //console.log(result)
      //console.log(player())
      //console.log(Players.findOne({_id:player()._id}))
      Players.update({_id:player()._id}, {$set: {game_id: result}},
                     function(e,i){
                       Session.set("ingame",Math.random());});
    }
  });
  }
});


//////
////// OVERLAY template: shows the "summary of day"
//////


Template.overlay.helpers({
  show : function () {
    var me = player();
    var g  = game(me);
    if (!g) {return false}
    if ( g.rounds.length % 3 == 0 && g.clock == 0){
      return true;
    }
  },
 
  text : function () {
    var me = player();
    var grp = getGroup(me);
    var g  = game(me);
    if (g == null) return ""

    r = g.rounds;   
    var totalPossiblePoints = 0
    if(grp =="loss"){
      totalPossiblePoints = 
          highest_possible_score(r[r.length-1]) +
          highest_possible_score(r[r.length-2]) +
          highest_possible_score(r[r.length-3])
    }     
    else if (grp =="gain"){
      totalPossiblePoints = 
          lowest_possible_score(r[r.length-1]) +
          lowest_possible_score(r[r.length-2]) +
          lowest_possible_score(r[r.length-3])
    }     
    
    //TODO getPLayerScorePERDAY  
    var score_sentance = "SUMMARY OF THE DAY: You ate "+ getPlayerScore(me) +" calories out of "+ totalPossiblePoints +" possible. "

    var framing_sentance = ""
    if (grp =="loss") {
      framing_sentance = "Wow, you sure ATE a LOT of calories. You are at a HIGHER RISK for type 2 diabetes. "
    }
    else if (grp =="gain"){
      framing_sentance = "Wow, you sure AVOIDED a lot calories. You are at a LOWER RISK for type 2 diabetes. "
    }

    //var continue_sentance = "Get ready for the next goal! "

    return score_sentance + framing_sentance ;
  }
});

//////
////// BOARD template: renders the board and the clock given the
////// current game.  
//////


Template.board.helpers({
  group_aim : function () {
    me = player();
    return getGroupAim(me) + " caloric"
  },

  square : function (i) {
    var me = player();
    var g = game(me);
    var display_card = '';

    if (g != null && g && g.rounds[g.rounds.length-1] != null) {
      display_card = 'imgs/cards/'+g.rounds[g.rounds.length-1][i].card_name+'.jpeg';
    }
    else {
      var x = random(1200)
      var size = "" 
      if (x < 300) size = "1"
      else if (x < 600) size = "2"
      else if (x < 900) size = "3"
      else size = "4"
      var avatar = random(5)+1 
      var color = ""
      if (avatar==1) color = "Yellow"
      else if (avatar==2) color = "Blue"
      else if (avatar==3) color = "Green"
      else if (avatar==4) color = "Orange"
      else if (avatar==5) color = "Purple"
      display_card = 'imgs/monsters/'+color+"_stage"+size+'.png ';
    }
    return display_card
  },

   //this is where I enlarged the size of the pics on the board and FOOD cards
  squaresize : function () {
    return 'width:145px; height:142px';
  },

  selected : function (i) {
    return Session.get('selected_' + i);
  },

  bkgd : function () {
    //if we are in the lobby, not a game, no background
    var me = player();
    if (!game(me)) {return ""}
    //otherwise show a nice colored background
    var c = game(me).rounds.length % 3;
    if (c==1){//morning
      return "green";
    };
    if (c==2) {//afternoon
      return "blue";
    };
    if (c==0) {//evening
      return "pink";
    };
    return '';
  },

  clock : function () {
    var me = player();
    if (game(me) == null || game(me).clock == 0)
      return;

    var clock =  game(me).clock;
    // format into Minute : Seconds like 0:03
    var min = Math.floor(clock / 60);
    var sec = clock % 60;
    return min + ':' + (sec < 20 ? ('0' + sec) : sec);
  }
});

var cards_selected=0;
Template.board.events({
  'click .square': function (evt) {
    var me = player();
    if (game(me) && game(me).clock != 0 && cards_selected < 3) { 
    //when you change the last number on this line, change "instructions" in html
    
    /////////////// this is finding the food card id in a complex way //////////
    // card id might be in this div
    var dom_card_id = evt.target.id;
    var c_id = dom_card_id.substring(5);
    
    //or might be in parent div
    var p_card_id = evt.target.parentNode.id;
    var pc_id = p_card_id.substring(5);
    
    //but it wont be in both (ie one will be empty)
    var id = c_id + pc_id;


    if (Session.get('selected_'+id)!='last_in_path') {
      Session.set('selected_' + id, 'last_in_path');
      
      //GET CARD NAME
      var g = game(me);
      var card_name = g.rounds[g.rounds.length-1][id].card_name;                      
      
      //TODO - merge and extract these, need currying, does js have this?
      //return true or false, if the item matches the car_name variable
      var matchesC = function(e,i,l){
        return (e.card_name == card_name)
      };

      new_card = DECK.find(matchesC);

      all_players = g.players;
      all_players.find(matchesP).card_set.push(new_card);
      
      //can't set fields of fields. can only change top level fields of mongo
      Games.update({_id:g._id}, {$set: {players: all_players}}); 
      ////console.error(g.players.find(matchesP).card_set);
      cards_selected+=1;
    }
  }
  }
});

Template.postgame.helpers({
  inGame: function () {
    var me = player();
    return game(me);
    //return true;
  },
  finishedGame: function () {
    var me = player();
    var g = game(me);
    return (g && g.rounds.length == roundsPerGame && g.clock ==0);
  },
  endOfRound: function () {
    try {document.getElementById('postgame').style.visibility = 'visible';}
    catch(err) {
      //console.log(err);
    }
    var me = player();
    return (game(me) && game(me).clock == 0);
  }
});

Template.postgame.events({
  'click button': function (evt) {
    clear_selected_positions();
    cards_selected = 0;

    // ODOMETER
    //setTimeout(function(){
    //odometer.innerHTML = 456;
    //}, 1000);
    
    //this pop up window comes up after "NEXT ROUND" is clicked
    //MAYBE have this only after the 10 or so practice rounds before the "TEST" round. 
    //window.alert("Next round will be a test to see if you choose the highest three");

    //multiple ROUNDS fxn is called here
    document.getElementById('postgame').style.visibility = 'hidden';
    var me = player();
    Meteor.call('new_round',me,game(me)._id);

  }
});

//////
////// 'SCORES' shows everyone's score and list of selected food cards.
//////


//This part shows the entire section that lists scores, selected items, avatar
Template.scores.helpers({
  show : function () {
    // !! is turning the object into a boolean
    var me = player();
    return !!game(me);
  },
  players : function () {
    var me = player();
    return game(me).players;
  }
});

Template.player.helpers({
  winner : function () {
  //the following winner function was brought back from being commented out and nothing happens. Winner still doesn't show up. 
  var me = player();
  var g = game(me);
  if (g.winners && _.include(g.winners, this._id))
    return 'winner';
    return '';
  },

  // how total score is added (selected items show their individual scores even w/o this code, 
  // but TOTAL is not calculated w/o this section)
  total_score : function () {
    var me = player();
    var total_score = getPlayerScore(me);
 
    var oldVal = $("#total_score").text();
    if (oldVal != total_score) {
      foo(oldVal,total_score);
    }

    function foo(oldV,newV) {
      var $el = $("#total_score"),
          value = newV;
    
      $({percentage: oldV}).stop(true).animate({percentage: value}, {
        duration : 500,
        easing: "linear",
        step: function () {
            // percentage with 1 decimal;
            var percentageVal = Math.round(this.percentage);
            $el.text(percentageVal);
           }
        }).promise().done(function () {
          // hard set the value after animation is done to be
          // sure the value is correct
          $el.text(value);
        });
   }; 
  },

  //this 'updates' the avatar id every second
  //not good, but works
  random_monster : function () {
    var me = player();
    var x = getPlayerScore(me);
    var size = "" 
    if (x < 300) size = "1"
    else if (x < 600) size = "2"
    else if (x < 900) size = "3"
    else size = "4"
    var color = ""
    if (me.avatar==1) color = "Yellow"
    else if (me.avatar==2) color = "Blue"
    else if (me.avatar==3) color = "Green"
    else if (me.avatar==4) color = "Orange"
    else if (me.avatar==5) color = "Purple"
    return 'imgs/monsters/'+color+"_stage"+size+'.png ';
  },

  monster_size : function () {
    //return 'width:'+ '128' + 'px; height:128px';
    return '250px';
  },
  cards : function() {
    var me = player();
    g = game(me);
    return g.players.find(matchesP).card_set.reverse();
  }
});



//////
////// Initialization
//////

Meteor.startup(function () {
  // Allocate a new player id.
  //
  // XXX this does not handle hot reload. In the reload case,
  // Session.get('player_id') will return a real id. We should check for
  // a pre-existing player, and if it exists, make sure the server still
  // knows about us.
  Meteor.subscribe('players');
  
  // subscribe to all the players, the game i'm in, and all
  // the words(i.e., food cards) in that game.
  //Deps.autorun(function () {
  //  Meteor.subscribe('players');
  
  
  Tracker.autorun(function () {
    //console.log("checking for games");
    if (Session.get("ingame")) {
      //console.log("really checking for games");
      var me = player();
      if (me) {
        Meteor.subscribe('games', me._id);
        //console.log("got games from server, ready to play");
        Session.set("game ready trigger",Math.random());
      }
    }
  }); 
  //Meteor.subscribe('games');
  // send keepalives so the server can tell when we go away.
  //
  // XXX this is not a great idiom. meteor server does not yet have a
  // way to expose connection status to user code. Once it does, this
  // code can go away.
  /*Meteor.setInterval(function() {
    if (Meteor.status().connected)
      Meteor.call('keepalive', Session.get('player_id'));
  }, 5*1000);*/


});



//////
////// Utility functions
//////

var matchesP = function(e,i,l){
  return (e._id == player()._id);
};

var player = function () {
  if(getCookieValue('u_id')=='') {
     //console.log("no player found, making a new one");
      var player_id =
         Players.insert({game_id:null,
                         name: "New User", 
                         idle: false, 
                         avatar: random(6)+1,
                         performance:[],
                         snackazonChoices:[],
                         group: "loss"});
      document.cookie="u_id="+player_id+"; path=/";
  }
  else{
     //console.log("ate cookie and found user");
  }
  //this is a huge performance hit i bet
  return Players.findOne(getCookieValue('u_id'));
 
};

function getCookieValue(a) {
  var b = document.cookie.match('(^|;)\\s*' + a + '\\s*=\\s*([^;]+)');
  return b ? b.pop() : '';
}

var game = function (me) {
  //Session.get("game ready trigger");
  if(me == null) return false;
  var g = Games.findOne(me.game_id);
  //console.log(me);
  //console.log(g);
  return g;
};


//ensure you only get the group when the user has already been assigned
var getGroup = function (me){
  if (me == null) return ""
  if (me.group=="loss") return "loss"
  else if (me.group=="gain") return "gain"
  else { console.error("user doesn't have a group") }
  return "no group"
};

var getGroupAim = function(me){
  aim = ""
  grp = getGroup(me);
  if (grp=="loss") aim = "highest"
  else if (grp=="gain") aim = "lowest"
  return aim
}

var clear_selected_positions = function () {
  for (var pos = 0; pos < 16; pos++)
    Session.set('selected_' + pos, false);
};

var random = function(i) {
  return Math.floor(Math.random() * (i));
}

var getPlayerScore = function(me) {

  var total_score = 0;
  var addScores = function(e,i,l) {
    total_score += e.calories;
  };

  var card_set = game(me).players.find(matchesP).card_set;
  card_set.forEach(addScores);
  return total_score;
}

