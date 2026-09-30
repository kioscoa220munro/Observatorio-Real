const CENTER=[-58.515,-34.526];
let map=null,marker=null;
const card=document.querySelector("#point-card"),coords=document.querySelector("#coords");

function showPoint(p){coords.textContent=`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;card.classList.remove("hidden");}
function clearPoint(){if(marker){marker.remove();marker=null;}card.classList.add("hidden");}
function resetToVicenteLopez(){if(map)map.flyTo({center:CENTER,zoom:13,pitch:35,bearing:0,duration:700});}

function init(){
  if(typeof maplibregl==="undefined"){document.querySelector("#map").innerHTML="<div class='map-error'>No se pudo cargar el motor del mapa.</div>";return;}
  map=new maplibregl.Map({
    container:"map",
    style:"https://tiles.openfreemap.org/styles/liberty",
    center:CENTER,zoom:13,pitch:35,bearing:0,
    attributionControl:true,
    cooperativeGestures:false
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");

  map.on("error",e=>console.warn("MapLibre:",e.error||e));
  map.on("load",()=>{map.resize();});
  map.on("click",e=>{
    if(marker)marker.remove();
    marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat(e.lngLat).addTo(map);
    showPoint(e.lngLat);
  });

  document.querySelector("#clear-point").addEventListener("click",clearPoint);
  document.querySelector("#save-point").addEventListener("click",()=>{
    if(!marker)return;
    const p=marker.getLngLat();
    localStorage.setItem("observatorio-real-last-point",JSON.stringify({lat:p.lat,lng:p.lng,at:new Date().toISOString()}));
    document.querySelector("#save-point").textContent="Guardado ✓";
    setTimeout(()=>document.querySelector("#save-point").textContent="Guardar punto",1400);
  });

  document.querySelector("#locate").addEventListener("click",()=>{
    if(!navigator.geolocation){alert("La ubicación no está disponible en este dispositivo.");return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const p={lat:pos.coords.latitude,lng:pos.coords.longitude};
      map.flyTo({center:[p.lng,p.lat],zoom:16,pitch:45,duration:800});
      if(marker)marker.remove();
      marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat([p.lng,p.lat]).addTo(map);
      showPoint(p);
    },()=>alert("No se pudo obtener la ubicación. Podés marcar el punto directamente sobre el mapa."),{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
}
init();
