var spreadsheetId = PropertiesService.getScriptProperties().getProperty('spreadsheetId');
var memberSheet=PropertiesService.getScriptProperties().getProperty('memberSheet');
var levelSheet=PropertiesService.getScriptProperties().getProperty('levelSheet');
var playedSheet=PropertiesService.getScriptProperties().getProperty('playedSheet');
var logSheet=PropertiesService.getScriptProperties().getProperty('logSheet');
var CACHE={}
var RUN_TIME=Math.floor(Date.now() / 1000) //seconds epoch
var pointMap={}
var emotes={
  "robo":" <:SpigRobo:628051703320805377> ",
  "think":" <:SpigThink:628055669802532877> ",
  "PigChamp":" <:PigChamp:628055057690132481> ",
  "buzzyS": " <:buzzyS:631302577111433219> ",
  "bam":" <:bam:628731347724271647> ",
  "love":" <:SpigLove:628057762449850378> ",
  "GG":" <:SpigGG:628051839597674517> ",
}

var point_rank=[]
function get_rank(points){
  for(var i=point_rank.length-1;i>=0;i--){
    if(parseFloat(points)>=parseFloat(point_rank[i]["Min Points"])){
      return {
        name:point_rank[i].Rank,
        pips:point_rank[i].Pips
      }
    }
  }
  return false
}

function doGet(request){
  point_rank=gs_select("TeamShell Ranks")
    
    
  
  Logger.log(request)
  if(logSheet) insertRow(logSheet,[RUN_TIME,"'"+request.parameter.q])
  
  if(!request.parameter.q){
    return ContentService.createTextOutput(emotes.robo+"Something Went Wrong"); //return msg to show on discord with reply to caller
  }

  //should check if discord
  //process query into discord_id,discord_name and query
  var par=request.parameter.q.split("|"); //format discord_name|discord_id| urlencoded(command|parameters)
  if(par.length!=3) return ContentService.createTextOutput("Unrecognised command")
  var user_name=decodeURIComponent(par[0]).trim() //discord name
  var user_id=par[1].trim()
  var command=decodeURIComponent(par[2]).replace(/\s\s+/g, ' ').trim().split("|");
  var command_type=(command.splice(0,1)+"").trim();
  var command=command.join("|").trim()
  
  //get the difficulty->points info
  var points = Sheets.Spreadsheets.Values.get(spreadsheetId,"Points").values;
   for (var row = 0; row < points.length; row++) {
     pointMap[parseFloat(points[row][0])]=parseFloat(points[row][1])
   }
  
  //default msg if command not found
  var msg="Unrecognized command "+emotes.think;
  var rank_pip=" "
  var reply_prefix=emotes.robo+" <@"+user_id+">"; //sets up the reply for discord
  
  if(command_type=="register"){ //register member
    msg=add_user(command,user_name,user_id)
  } else { //check if already registered
   var user=gs_select(memberSheet,{"discord_id":user_id})
   if(user){ 
     if(command_type=="atme"){
       msg=updateAtMe(user_id,1)
     } else if(command_type=="dontatme"){
       msg=updateAtMe(user_id,0) 
     } else if(command_type=="clear"){ //clear a laval
       msg=add_played(command,user) 
     } else if(command_type=="difficulty"){ //vote difficulty
       msg=set_difficulty(command,user) 
     } else if(command_type=="removelevel"){ //vote difficulty
       msg=remove_level(command,user) 
     } else if(command_type=="removeclear"){ //vote difficulty
       msg=remove_clear(command,user) 
     } else if(command_type=="like"){  //group existing_level groups together
       msg=set_like(command,user,1)
     } else if(command_type=="unlike"){
       msg=set_like(command,user,0)
     } else if(command_type=="rename"){
       msg=rename_level(command,user) 
     } else if(command_type=="addtags"){
       msg=add_tags(command,user)
     } else if(command_type=="removetags"){
       msg=remove_tags(command,user)
     } else if(command_type=="addvods"){
       msg=add_vods(command,user)
     } else if(command_type=="removevods"){
       msg=remove_vods(command,user)
     }
     
     var earned_points=calculatePoints(user_id) 
     var rank=get_rank(earned_points.clearPoints.toFixed(2))
     var rank_pip=rank.pips+" "
     if(command_type=="add"){ //add laval
       //check points if can
       if(earned_points.available>=0){
         msg=add_level(command,user)
       } else {
         msg="You need "+Math.abs(earned_points.available).toFixed(1)+" points to upload a new level "+emotes.buzzyS+". Check how the points are mapped on http://bit.ly/teamshell.";
       }
     } else if(command_type=="points"){
       msg="You have "+earned_points.clearPoints.toFixed(1)+" clear points. You have submitted "+earned_points.levelsMade+" level(s). "

       if(earned_points.available>=0){
         msg+="You have enough points to upload a level "+emotes.PigChamp; 
       } else {
         msg+="You need "+Math.abs(earned_points.available).toFixed(1)+" points to upload a new level "+emotes.buzzyS+". Check how the points are mapped on http://bit.ly/teamshell.";
       }
       msg+=" You have earned the rank **"+rank.name+"** "+rank.pips
     }
   } else {
     msg="You are not registered yet "+emotes.think+". You can go to <#627813316068376605> and type `!register your-nickname` to register"
   }
  }
  return ContentService.createTextOutput(reply_prefix+rank_pip+msg); //return msg to show on discord with reply to caller
}



//new code
function rename_level(level_info,user){  
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  if(user.shelder || user.Name==existing_level.Creator){
    var ret=gs_query(levelSheet,{
      filter:{"Code":existing_level.Code},
      update:{"Level Name":par.level_info}
    })
    
    if(ret.updated["Level Name"]){
      return "You have renamed "+par.level_code+" to "+par.level_info+" "+emotes.bam
    } else {
      return "Level name is already \""+par.level_info+"\""
    }
  } else {
      return "You can't rename this level"  
  }
}
    


function add_tags(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  var current_tags=existing_level.Tags?existing_level.Tags.split(","):[]
  var new_tags=par.level_info.trim().split(",")
  var updated=false;
  for(var i=0;i<new_tags.length;i++){
    if(current_tags.indexOf(new_tags[i].trim())===-1){
      current_tags.push(new_tags[i].trim())
      updated=true;
    }
  }
  
  if(updated){
    gs_query(levelSheet,{
      filter:{"Code":existing_level.Code},
      update:{"Tags":current_tags.join(",")}
    })
  }
  
  return existing_level["Level Name"]+" is tagged *"+current_tags.join(",")+"*."+ (updated?"":" No new tags added")
}

function remove_tags(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  if(user.shelder || user.Name==existing_level.Creator){
    var current_tags=existing_level.Tags?existing_level.Tags.split(","):[]
    var remove_tags=par.level_info.trim().split(",")
    var updated=false;
    var new_tags=[];
    for(var i=0;i<current_tags.length;i++){
      if(remove_tags.indexOf(current_tags[i].trim())===-1){
        new_tags.push(current_tags[i])
      } else {
        updated=true; 
      }
    }
    new_tags=new_tags.join(",")
    if(updated){
      gs_query(levelSheet,{
        filter:{"Code":existing_level.Code},
        update:{"Tags":new_tags}
      })
    }
    return existing_level["Level Name"]+ " "+ (new_tags?"is tagged *"+new_tags+"*.":"has no tags.")+ (updated?"":" No tags removed")
  } else {
    return "You can't remove tags from this level"  
  }
}

function add_vods(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  var current_vods=existing_level["Clear Video"]?existing_level["Clear Video"].split(","):[]
  var new_vods=par.level_info.trim().split(",")
  var updated=false;
  for(var i=0;i<new_vods.length;i++){
    if(current_vods.indexOf(new_vods[i].trim())===-1){
      current_vods.push(new_vods[i].trim())
      updated=true;
    }
  }
  
  if(updated){
    gs_query(levelSheet,{
      filter:{"Code":existing_level.Code},
      update:{"Clear Video":current_vods.join(",")}
    })
  }
  
  return (updated?"Video links added":" No new videos added")+" for "+existing_level["Level Name"]
}

function remove_vods(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  if(user.shelder || user.Name==existing_level.Creator){
    var current_vods=existing_level["Clear Video"]?existing_level["Clear Video"].split(","):[]
    var remove_vods=par.level_info.trim().split(",")
    var updated=false;
    var new_vods=[];
    for(var i=0;i<current_vods.length;i++){
      if(remove_vods.indexOf(current_vods[i].trim())===-1){
        new_vods.push(current_vods[i])
      } else {
        updated=true; 
      }
    }
    
    if(updated){
      gs_query(levelSheet,{
        filter:{"Code":existing_level.Code},
        update:{"Clear Video":new_vods.join(",")}
      })
    }

    return (updated?"Video links removed":" No videos added")+" for "+existing_level["Level Name"]
  } else {
    return "You can't remove vids from this level"  
  }
}

function set_like(level_info,user,like){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level) return "Level code was not found in Team Shell's list "+emotes.think;
  
  var obj=gs_query(playedSheet,{
    filter:{"Code":par.level_code,"Player":user.Name},
    update:{"Liked":like}
  });
  
  if(obj){
    if(obj.updated["Liked"]){
      if(like){
        return "You have liked \""+existing_level["Level Name"]+"\" "+emotes.love
      } else {
        return "You have removed your like for \""+existing_level["Level Name"]+"\" "+emotes.bam
      }
    } else {
      if(like){
        return "You have already liked \""+existing_level["Level Name"]+"\" "+emotes.love
      } else {
        return "You have not liked \""+existing_level["Level Name"]+"\" "+emotes.bam
      }
    }
  }
  return "You have not submitted a clear for \""+existing_level["Level Name"]+"\" yet "+emotes.think
}


function add_played(level_info,user,not_cleared){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  par.level_info=par.level_info.split(" ")
  var difficulty_rating=par.level_info[0]
  var liked=par.level_info[1]
  
  if(difficulty_rating.toUpperCase()=="LIKE"){
   difficulty_rating=""
   liked=1
  }
  
  if(!difficulty_rating && not_cleared){
   return "You have not provided any difficulty rating"+emotes.think
  }
  
  if(difficulty_rating && !valid_difficulty(difficulty_rating)){
   return "The difficulty rating you provided was invalid "+emotes.think;
  }
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(
    !existing_level || //level doesn't exist
    !(existing_level.Approved==0 || existing_level.Approved==1) //level is removed. not pending/accepted
   ){
    return "Level code was not found in Team Shell's list "+emotes.think;
  }
 
  var existing_play=gs_select(playedSheet,{"Code":par.level_code,"Player":user.Name})
  var creator=gs_select(memberSheet,{"Name":existing_level.Creator})
  
  if(user.shelder && existing_level.Approved=="0" && difficulty_rating){      //still pending
    var approve=gs_query(levelSheet,{
      filter:{"Code":par.level_code},
      update:{"Approved":1,"Difficulty":difficulty_rating}
    })
    if(creator.cult_member!="1"){
      var update_creator=gs_query(memberSheet,{
        filter:{"Name":existing_level.Creator},
        update:{"cult_member":"1"}
      })
    }
  } 
  
  if(existing_play){
    if(existing_play.Completed=="1"){
      return "You have already submitted a clear for this level"
    } else if(!not_cleared) {
      gs_query(playedSheet,{
        filter:{"Code":par.level_code,"Player":user.Name},
        update:{
          "Completed":1,
          "Liked":liked?1:0,
          "Difficulty Vote":difficulty_rating?parseFloat(difficulty_rating):'',
          "Timestamp":RUN_TIME
        } 
      })
    }
  } else {
    insertRow(playedSheet,[
      "'"+par.level_code,
      "'"+user.Name,
      not_cleared?0:1,
      user.shelder?1:0,
      liked?1:0,
      difficulty_rating?parseFloat(difficulty_rating):'',
      RUN_TIME
    ])
  }

  if(creator.atme=="1"){
   var creator_str="<@"+creator.discord_id+">"
  } else {
   var creator_str=creator.Name
  }
  
  if(not_cleared){
    var ret="You voted "+difficulty_rating+" as the difficulty for \""+existing_level["Level Name"]+"\" by "+creator_str+" "+emotes.bam
  } else {
    var ret="You have cleared \""+existing_level["Level Name"]+"\"  by "+creator_str+" "+emotes.GG
    ret+=(difficulty_rating?"You voted "+difficulty_rating+" as the difficulty. ":"")
   if(existing_level.Approved=="1"){
    ret+="You have earned "+pointMap[parseFloat(existing_level.Difficulty)]+" points. ";     
   } else if(existing_level.Approved=="0" && approve){
    ret+="You have approved this level. ";     
   } else if(existing_level.Approved=="0"){
    ret+="This level is still pending. "
   }
  }
  if(liked){
   ret+="You have also liked the level "+emotes.love
  }
         
  return ret;
}




function set_difficulty(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  par.level_info=par.level_info.split(" ")
  var difficulty_rating=par.level_info[0]
  var liked=par.level_info[1]
  
  if(!difficulty_rating && not_cleared){
   return "You have not provided any difficulty rating"+emotes.think
  }
  
  if(difficulty_rating && !valid_difficulty(difficulty_rating)){
   return "The difficulty rating you provided was invalid "+emotes.think;
  }
  


  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(
    !existing_level || //level doesn't exist
    !(existing_level.Approved==0 || existing_level.Approved==1) //level is removed. not pending/accepted
   ){
    return "Level code was not found in Team Shell's list "+emotes.think;
  }
  
  var creator=gs_select(memberSheet,{"Name":existing_level.Creator})
  if(user.shelder && difficulty_rating){      //still pending
    var approve=gs_query(levelSheet,{
      filter:{"Code":par.level_code},
      update:{"Approved":1,"Difficulty":difficulty_rating}
    })  
    if(creator.cult_member!="1"){
      var update_creator=gs_query(memberSheet,{
        filter:{"Name":existing_level.Creator},
        update:{"cult_member":"1"}
      })
    }
  } 
  
  var existing_play=gs_query(playedSheet,{
        filter:{"Code":par.level_code,"Player":user.Name},
        update:{
          "Liked":liked?1:0,
          "Difficulty Vote":difficulty_rating?parseFloat(difficulty_rating):'',
          "Timestamp":RUN_TIME
        } 
    })
  
  var ret=""
  if(existing_play){
    if(existing_play.updated["Difficulty Vote"]){
      ret+="You voted "+difficulty_rating+" as the difficulty for \""+existing_level["Level Name"]+"\" "+emotes.bam   
    } else {
      ret+="You have already voted "+difficulty_rating+" as the difficulty for \""+existing_level["Level Name"]+"\" "+emotes.bam   
    }
    return ret
  } else {
    return add_played(level_info,user,0)
  }
}


function add_level(level_info,user){  
  var par=parse_level_code(level_info)
  if(par.error) return par.error
   
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(existing_level) return "Level code has already been added as \""+existing_level["Level Name"]+"\" by "+existing_level.Creator+" "+emotes.think;
  
  if(!par.level_info) return "You didn't give the level's name "+emotes.think;
  
  insertRow(levelSheet,[par.level_code,user.Name,par.level_info,0,0,'','',RUN_TIME])
  add_played(par.level_code,user)
  
  return "\""+par.level_info+"\" ["+par.level_code+"] has been added "+emotes.love;
}

function remove_clear(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level){
    return "Level code was not found in Team Shell's list "+emotes.think;
  }
  
  var existing_play=gs_query(playedSheet,{
    filter:{"Code":par.level_code,"Player":user.Name},
    update:{
      "Completed":0,
      "Liked":0,
      "Difficulty Vote":'',
      "Timestamp":RUN_TIME
    } 
  })

  if(existing_play && existing_play.updated["Completed"]){
   return "You have removed your clear for "+existing_level["Level Name"]+" "+emotes.bam
  } 
  
   return "You have not submited a clear for "+existing_level["Level Name"]+" "+emotes.think
}

function remove_level(level_info,user){
  var par=parse_level_code(level_info)
  if(par.error) return par.error
  
  
  var existing_level=gs_select(levelSheet,{"Code":par.level_code})
  if(!existing_level){
    return "Level code was not found in Team Shell's list "+emotes.think;
  }

  if( !( existing_level.Approved==0 || existing_level.Approved==1 ) ){
    return "The level has already been removed"+emotes.think;
  }
  
  if(user.shelder || user.Name==existing_level.Creator){
    return "You can't remove this level"+emotes.think;
  }
  
  var approve=gs_query(levelSheet,{
    filter:{"Code":par.level_code},
    update:{"Approved":"del:"+existing_level.Approved}
  })  

  return "You removed \""+existing_level["Level Name"]+"\" from the list "+emotes.buzzyS
}


//old code
function add_user(user_name,discord_name,discord_id){
  if(!user_name){
   user_name=discord_name; 
  }
  user_name=user_name.trim()
  
  var existing_name=get_user(discord_id)
  if(existing_name) return "You are already registered as \""+existing_name[0]+"\" <:SpigThink:628055669802532877>";
  if(check_exist_name(user_name)) return "\""+user_name+"\" is already being used <:SpigThink:628055669802532877>";
  
  insertRow(memberSheet,[
    "'"+user_name,
    '',
    '',
    "'"+discord_id,
    "'"+discord_name,
    '',
    '',
    RUN_TIME])
  return user_name+" has been registered <:PigChamp:628055057690132481>";
}


function updateAtMe(user_id,toggle){
  var values = Sheets.Spreadsheets.Values.get(spreadsheetId,memberSheet).values;
  if (!values) return false
  for (var row = 0; row < values.length; row++) {
    if(values[row][3].trim()==user_id){
      if(values[row][9]!=toggle){
        updateCell(spreadsheetId,memberSheet,"J",row,toggle); 
        return toggle?"You will be @-ed when somebody submits a clear of your level":"We will not @ you if somebody submits a clear of your level.";
      } else {
        return toggle?"You are already set to recieve @s when somebody submits a clear of your level":"You are already set to not recieve any @s you if somebody submits a clear of your level.";
      }
    }
  }
  return "User not found";
}



function get_user(user_id){
  var values = Sheets.Spreadsheets.Values.get(spreadsheetId,memberSheet).values;
  if (!values) return false
  for (var row = 0; row < values.length; row++) {
    if(values[row][3].trim()==user_id)
      return values[row];
  }
  return false
}

function check_exist_name(user_name){
  var currentMembers = Sheets.Spreadsheets.Values.get(spreadsheetId,memberSheet).values;
  if(!currentMembers) return false;
  for (var row = 0; row < currentMembers.length; row++) {
    if(currentMembers[row][0].trim()==user_name){
      return true;
  }
 }
  return false;
}

function get_user_by_name(user_name){
  var currentMembers = Sheets.Spreadsheets.Values.get(spreadsheetId,memberSheet).values;
  if(!currentMembers) return false;
  for (var row = 0; row < currentMembers.length; row++) {
    if(currentMembers[row][0].trim()==user_name){
      return currentMembers[row];
  }
 }
  return false;
}

//utility
function parse_level_code(raw_level_info){
  raw_level_info=raw_level_info.trim().split(" ");
  var ret={
    error:false,
    level_code:(raw_level_info.splice(0,1)+"").toUpperCase(),
    level_info:raw_level_info.join(" ").trim(),
  }
  
  if(!valid_format(ret.level_code)) ret.error="Level code given was not in xxx-xxx-xxx format <:SpigThink:628055669802532877>"
  if(!valid_code(ret.level_code))   ret.error="There were some invalid characters in your level code <:SpigThink:628055669802532877>"

  return ret
}

function get_variable(variable_name){
  var vars = Sheets.Spreadsheets.Values.get(spreadsheetId,"TeamShell Variable").values;
  if(!vars) return false;
  for (var row = 0; row < vars.length; row++) {
    if(vars[row][0].trim()==variable_name){
      return vars[row][1];
  }
 }
  return false;
}


//assumptions for the update. The range starts at 0
function updateCell(_spreadsheetId,sheetName,row,col,value){ //row is A-Z, etc;
  Sheets.Spreadsheets.Values.update(
    {values:[[value]]},
    _spreadsheetId,
    "'"+sheetName+"'!"+row+""+(1+col),
    {valueInputOption: "RAW"}
  );
}


function levelsAvailable(points,levelsUploaded){
  var min=parseFloat(get_variable("Minimum Point"));
  var next=parseFloat(get_variable("New Level"));
  
  var nextLevel=levelsUploaded+1;
  var nextPoints= nextLevel==1? min : min+ (nextLevel-1)*next
  
  points=parseFloat(points);
  
  var pointsDifference=points-nextPoints;
  return pointsDifference
}

function calculatePoints(user_id){
   var user=get_user(user_id)
   user=user[0] //registered name

   var currentLevels = Sheets.Spreadsheets.Values.get(spreadsheetId,levelSheet).values;
   var levelMap={}
   var ownLevels=[];
   var ownLevelPoints=0;
   var reuploads={}
   for (var row = currentLevels.length-1; row >=0 ; row--) {
     if(currentLevels[row][4]=="1"){
       if(currentLevels[row][1]==user){
         ownLevels.push(currentLevels[row][0])
         ownLevelPoints += pointMap[parseFloat(currentLevels[row][3])]? pointMap[parseFloat(currentLevels[row][3])] :0
       } else {
         levelMap[currentLevels[row][0]]=pointMap[parseFloat(currentLevels[row][3])]  
       }
     } else if(currentLevels[row][4]=="2") { //reupload
       if(currentLevels[row][1]==user){
         //reuploads don't count for self
       } else {
         if(currentLevels[row][5]){
           reuploads[currentLevels[row][0]]=currentLevels[row][5]
           levelMap[currentLevels[row][0]]=pointMap[parseFloat(currentLevels[row][3])]
         }
       }
     } else if(currentLevels[row][4]=="0" && currentLevels[row][1]==user) {
       ownLevels.push(currentLevels[row][0])
     }
      
   }
  
   var playedLevels = Sheets.Spreadsheets.Values.get(spreadsheetId,playedSheet).values;
   var userCleared={};
   for (var row = 0; row < playedLevels.length; row++){
     if(playedLevels[row][1]==user && playedLevels[row][2]=="1"){ //played by user and cleared
       var id= reuploads[playedLevels[row][0]] ? reuploads[playedLevels[row][0]] : playedLevels[row][0]
       userCleared[id]=  Math.max( userCleared[id]?userCleared[id]:0, levelMap[playedLevels[row][0]] )
     }
   }
  
  var clearPoints=0;
  for(var id in userCleared){
    if(userCleared[id]) clearPoints+=userCleared[id]
  }

   
  return {
    clearPoints:clearPoints,
    ownPoints:ownLevelPoints,
    levelsMade:ownLevels.length,
    available:levelsAvailable(clearPoints,ownLevels.length),
  }
}

function gs_select(sheet,parameters){
  return gs_query(sheet,{filter:parameters}) 
}

var gs_cache={}
function gs_query(sheet,parameters){ //may break if column named updated or row
  if(gs_cache[sheet]){
   var querySheet = gs_cache[sheet]
  } else {
   var querySheet = Sheets.Spreadsheets.Values.get(spreadsheetId,sheet).values;
   gs_cache[sheet]=querySheet
  }

  if(!querySheet) return "No sheet found"
  var headers=querySheet[0];
  
  var header_to_id={}
  for(var i=0;i<headers.length;i++){
    header_to_id[headers[i]]=i;
  } 
  
  if(parameters && parameters.filter){
    var filter=function(row){
      var matched=true;
      for(var f in parameters.filter){
        if(row[header_to_id[f]]!=parameters.filter[f]) matched=false;
      }
      return matched;
    }
  } else {
      var filter=function(){return true;}
  }

  var ret=[]
  for (var row = 1; row < querySheet.length; row++){
    if(filter(querySheet[row])){
      var updated={}
      var obj={row:row}
      for(var i=0;i<headers.length;i++){
        obj[headers[i]]=querySheet[row][i]
      }
      
      if(parameters && parameters.update){

        var data=[]
        for(var u in parameters.update){
          if(obj[u]!=parameters.update[u]){
            data.push({ 
              range: r1c1(sheet,row,header_to_id[u]),
              values: [[parameters.update[u]]]
            })
            updated[u]=true;
          } else {
            updated[u]=false; 
          }
        }
        
        if(data){
           Sheets.Spreadsheets.Values.batchUpdate({data:data, valueInputOption: "USER_ENTERED" },spreadsheetId)
        }

      }
      obj.updated=updated
      ret.push(obj)  
    }
  } 
  return (ret.length>1) ? ret : ret[0]
}

function r1c1(sheet,r,c){ //A1 = R1C1
  return "'"+sheet+"'!r"+(r+1)+"c"+(c+1)
}

function insertRow(sheetName,value){
 return Sheets.Spreadsheets.Values.append({
    values:[value]
    }, spreadsheetId, sheetName, {
    valueInputOption:"USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
  }); 
}
function valid_format(code){
  return /^[0-9A-Z]{3}-[0-9A-Z]{3}-[0-9A-Z]{3}$/.test(code)
}

function valid_code(code){
return /^[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}-[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}-[1234567890QWERTYUPASDFGHJKLXCVBNM]{3}$/.test(code)
}


//hard coded for now. 10.5 and 11 just in case
var validDifficulty=[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3,3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9,4,4.1,4.2,4.3,4.4,4.5,4.6,4.7,4.8,4.9,5,5.1,5.2,5.3,5.4,5.5,5.6,5.7,5.8,5.9,6,6.1,6.2,6.3,6.4,6.5,6.6,6.7,6.8,6.9,7,7.1,7.2,7.3,7.4,7.5,7.6,7.7,7.8,7.9,8,8.1,8.2,8.3,8.4,8.5,8.6,8.7,8.8,8.9,9,9.1,9.2,9.3,9.4,9.5,9.6,9.7,9.8,9.9,10,10.5,11];
function valid_difficulty(str){
  for(var i=0;i<validDifficulty.length;i++){
    if(validDifficulty[i]==str) return true
  }
  return false;
}

