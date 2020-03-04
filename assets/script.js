//consolidates all the common functions to a file. 


//self contained dark mode code. requires jquery
var params=new URLSearchParams(window.location.search)
function setDark(val){
  console.log(val)
  if(val){
    localStorage.setItem("dark","1")
  } else {
    localStorage.removeItem("dark")
  }
}

if(localStorage.getItem("dark")){
  setDark(localStorage.getItem("dark")==="1")
} 

function makeDark(){
    document.getElementsByTagName("html")[0].className=localStorage.getItem("dark")==="1"?"dark":""
}
makeDark()

$(function(){
  $("#darkmode").change(function(){
    setDark($(this).prop("checked"))
    makeDark()
  }).prop("checked",localStorage.getItem("dark"))
})

/*
To be used for all data loading. Has the ability to use devids and caching

Takes a callback as argument. returs:
raw data-JSON in string form
dataNoChange- a flag that indicates if there were no changes in data if true

*/
function loadTeamshellApi(onLoad){
  var lastLoaded='',raw_data,noChange=false;
  if(raw_data=localStorage.getItem("cachedData")){
    _data=JSON.parse(raw_data)
    lastLoaded=_data.lastUpdated
  }
  var devid=get_input("devid")
  var url="https://script.google.com/macros/s/AKfycbwOZQzoqLRYbwSoTYWgJeT1A-YKfDKJf_2jqNBm5qmr_BncNL8/exec?callback=?&lastLoaded="+lastLoaded+("&devid="+(devid?devid:""))
  $.getJSON(url).done(function(_data){
  if(_data=="No Updated Needed"){
    noChange=true;
  } else {
    raw_data=JSON.stringify(_data)
    localStorage.setItem("cachedData",raw_data)
  }
    onLoad(raw_data,noChange)
  })
}

function copyClipboard(str){
  const el = document.createElement('textarea');
  el.value = str;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}


//for testing purposes
function dev(id){
  if(id){ 
    localStorage.setItem("devid",id)
    console.log('%c This site will now use the sheet with id '+id, 'background: #000; color: #f88501');
  } else {
    localStorage.removeItem("devid")
    console.log('%c This site will now use the main sheet', 'background: #000; color: ##01a09e;');
  }
}


function removeDups(names) {
  let unique = {};
  names.forEach(function(i) {
    if(!unique[i]) {
      unique[i] = true;
    }
  });
  return Object.keys(unique);
}

function ObjectLength_Modern( object ) {
    if(!object) return 0
    return Object.keys(object).length;
}

function ObjectLength_Legacy( object ) {
    if(!object) return 0
    var length = 0;
    for( var key in object ) {
        if( object.hasOwnProperty(key) ) {
            ++length;
        }
    }
    return length;
}

var ObjectLength = Object.keys ? ObjectLength_Modern : ObjectLength_Legacy;


  function save_input(query_name, obj){
    localStorage.setItem(query_name, ($(obj).val()));
  }

  function store_input(query_name,obj){
    if(params.get(query_name)){
      localStorage.setItem(query_name,params.get(query_name))
      $(obj).val(params.get(query_name))
    } else if(localStorage.getItem(query_name)){
      $(obj).val(localStorage.getItem(query_name))
    } else {
      localStorage.setItem(query_name,$(obj).val())
    }
  }
  
  function get_input(query_name){
    return localStorage.getItem(query_name)
  }

  function setGetParam(key,value) {
    localStorage.setItem(key,value)
    if (history.pushState) {
      var params = new URLSearchParams(window.location.search);
      params.set(key, value);
      var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?' + params.toString();
      window.history.pushState({path:newUrl},'',newUrl);
    }
  }