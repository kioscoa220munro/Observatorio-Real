const CENTER=[-58.515,-34.526];
let map=null;
let marker=null;
const card=document.querySelector("#point-card");
const coords=document.querySelector("#coords");

function showPoint(lngLat){
  coords.textContent=`${lngLat.lat.toFixed(6)}, ${lngLat.lng.toFixed(6)}`;
  card.classList.remove("hidden");
}
function clearPoint(){
  if(marker){marker.remove();marker=null;}
  card.classList.add("hidden");
}
function init(){
  map=new maplibregl.Map({
    container:"map",
    style:"https://tiles.openfreemap.org/styles/liberty",
    center:CENTER,
    zoom:12,
    pitch:0,
    bearing:0,
    attributionControl:true
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
  map.addControl(new maplibregl.ScaleControl({unit:"metric"}),"bottom-left");

  map.on("load",()=>{
    map.resize();
    const layers=map.getStyle().layers||[];
    const buildingLayer=layers.find(l=>l.type==="fill-extrusion" && /building/i.test(l.id));
    if(buildingLayer){
      map.setLayoutProperty(buildingLayer.id,"visibility","visible");
    }
  });

  map.on("click",(e)=>{
    if(marker) marker.remove();
    marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat(e.lngLat).addTo(map);
    showPoint(e.lngLat);
  });

  document.querySelector("#clear-point").addEventListener("click",clearPoint);
  document.querySelector("#save-point").addEventListener("click",()=>{
    if(!marker)return;
    const p=marker.getLngLat();
    localStorage.setItem("observatorio-real-last-point",JSON.stringify({lat:p.lat,lng:p.lng,at:new Date().toISOString()}));
    document.querySelector("#save-point").textContent="Punto guardado";
    setTimeout(()=>document.querySelector("#save-point").textContent="Guardar punto",1200);
  });
  document.querySelector("#reset-view").addEventListener("click",()=>{
    map.flyTo({center:CENTER,zoom:12,pitch:0,bearing:0,duration:900});
  });
  document.querySelector("#locate").addEventListener("click",()=>{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(pos=>{
      const p=[pos.coords.longitude,pos.coords.latitude];
      map.flyTo({center:p,zoom:16,duration:900});
      if(marker)marker.remove();
      marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat(p).addTo(map);
      showPoint({lat:pos.coords.latitude,lng:pos.coords.longitude});
    });
  });
}
init();