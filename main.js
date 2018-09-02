
// Remove ad
function remove_add(master_element) {
    var pub_elements = $(master_element).find("li:not([itemtype])");
    for(var i = 0;i<pub_elements.length;i++){
        pub_elements[i].remove();
    }
}

function get_element_name(element) {
    return element.getElementsByTagName("a")[0].getAttribute("title");
}

function get_master_element(source=undefined){
    var search_string = ".react-tabs__tab-panel ul";
    if (source===undefined){
        return $(search_string)
    }
    return $(source).find(search_string)
}


function init_map(){

    var layer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    var map = new ol.Map({
        layers: [layer],
        target: 'map',
        view: new ol.View({
            center: [0,0],
            zoom: 5
        })
    });

    return map;
}

function init_page() {
    var pub = document.getElementsByClassName('advertisingSkyscraper')[0];
    pub.parentNode.remove();
    var master = get_master_element();
    var left_column = $(master).parent().parent().parent();
    left_column.addClass("leftcol");
    master = left_column.parent().parent();
    master.parent().css("max-width","100%");
    master.append("<div id=\"map\" class=\"map\"></div>");
}

init_page();
var map = init_map();

function center_map(map, lat, long, zoom) {
    console.log("Long: " + long + " Lat: " + lat);
    map.getView().setCenter(ol.proj.transform([long, lat], 'EPSG:4326', 'EPSG:3857'));
    map.getView().setZoom(zoom);
}
center_map(map,47.011345, 2.400426,5);

function add_point(map,lat,lon,label,link, add_noise=false){
    if(add_noise){
        var gain = 0.005;
        function gen_noise(){
            return (Math.random()-0.5)*(2*gain);
        }
        lat += gen_noise();
        lon += gen_noise();
    }
    var pos = ol.proj.fromLonLat([lon,lat]);
    var divmap = document.getElementById('map');
    var id=hex_md5(label);
    let html_content = "<div style=\"display: none;\" class='ol_marker_main'>" +
        "<a style='display: none' class=\"overlay\" target=\"_blank\" id='label_"+id+"' href=\""+link+"\">"+label+"</a>\n" +
        "<div class=\"ol_marker\" id=\"marker_"+id+"\" title=\"Marker\"></div>\n"
    divmap.insertAdjacentHTML("beforeend",html_content);

    var marker = new ol.Overlay({
        position: pos,
        positioning: 'center-center',
        element: document.getElementById('marker_'+id),
        stopEvent: false
    });
    map.addOverlay(marker);

    var label_item = new ol.Overlay({
        position: pos,
        element: document.getElementById("label_"+id)
    });
    map.addOverlay(label_item);

    return {marker:marker,label:label_item}
}

function add_point_by_search(map, search_string,label,url,add_noise=false,callback=undefined){
    var request_url = "https://nominatim.openstreetmap.org/search?q="+search_string.split(" ").join("+")+"&format=json&polygon=0&addressdetails=1";
    $.ajax(request_url)
        .done(function (result) {
            if(result.length>0){
                var data = result[0];
                var lat = parseFloat(data["lat"]);
                var lon = parseFloat(data["lon"]);
                var res = add_point(map,lat,lon,label,url, add_noise);
                if (callback !== undefined){
                    callback(res)
                }
            }
        })
}

function get_elements(){
    var master_element = get_master_element();
    var elements = master_element.find("li");
    return elements;
}

function plot_elements(elements){
    for(var i=0;i<elements.length;i++){
        var element = elements[i];
        var a = $(element).find("a");
        var url = a.attr("href");
        var name = get_element_name(element);
        var loc = a.find("section p[data-qa-id=aditem_location]").text();
        add_point_by_search(map,loc,name,url,true,function (element) {
            return function (point) {
                var point_element = point["marker"].element;
                $(point_element).hover(function () {
                    element.scrollIntoViewIfNeeded();
                    $(element).css("backgroundColor","#aeecff")
                },function () {
                    $(element).css("backgroundColor","")
                })
            }
        }(element));
    }
}

function update_results(){
    map.getOverlays().clear();
    var master = get_master_element();
    remove_add(master);
    plot_elements(get_elements());
}

update_results();

function watch_element_change(callback) {
    var interval;
    function get_value(){
        return $(get_elements()[0]).find("a").first().attr("href");
    }
    var value=get_value();
    interval = setInterval(function () {
        var new_value=get_value();
        if(value!=new_value){
            clearInterval(interval);
            callback();
        }
    },2000)
}

var arm_watcher = function(){
    watch_element_change(function () {
        update_results();
        arm_watcher();
    });
};
arm_watcher();