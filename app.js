const CENTER=[-58.515,-34.526];
let map=null,marker=null;
const card=document.querySelector("#point-card");
const coords=document.querySelector("#coords");
const addressEl=document.querySelector("#address");
const placeEl=document.querySelector("#place");

function showPoint(p){coords.textContent=`Coordenadas: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;card.classList.remove("hidden");}
function clearPoint(){if(marker){marker.remove();marker=null;}card.classList.add("hidden");}
function setMarker(lng,lat){if(marker)marker.remove();marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat([lng,lat]).addTo(map);showPoint({lat,lng});}
async function reverseGeocode(lat,lng){
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res=await fetch(url,{headers:{Accept:"application/json"}});
    if(!res.ok)throw new Error("geocode");
    const data=await res.json();
    addressEl.textContent=data.display_name?data.display_name:"Dirección no disponible";
    const a=data.address||{};
    const locality=a.city||a.town||a.village||a.municipality||"";
    const district=a.county||a.state_district||"";
    placeEl.textContent=[locality,district].filter(Boolean).join(" · ");
  }catch{
    addressEl.textContent="Dirección no disponible";
    placeEl.textContent="";
  }
}
async function searchAddress(){
  const input=document.querySelector("#address-search");
  const results=document.querySelector("#search-results");
  const q=input.value.trim();
  if(!q)return;
  results.classList.remove("hidden");
  results.textContent="Buscando…";
  try{
    const query=q.toLowerCase().includes("argentina")?q:`${q}, Argentina`;
    const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    const res=await fetch(url,{headers:{Accept:"application/json"}});
    if(!res.ok)throw new Error("search");
    const data=await res.json();
    results.innerHTML="";
    if(!data.length){results.textContent="No encontramos esa dirección.";return;}
    data.forEach(item=>{
      const button=document.createElement("button");
      button.type="button";
      button.textContent=item.display_name;
      button.addEventListener("click",()=>{
        const lng=Number(item.lon),lat=Number(item.lat);
        map.flyTo({center:[lng,lat],zoom:17,pitch:35,duration:800});
        setMarker(lng,lat);
        reverseGeocode(lat,lng);
        results.classList.add("hidden");
      });
      results.appendChild(button);
    });
  }catch{
    results.textContent="No se pudo buscar ahora. Podés marcar el punto directamente en el mapa.";
  }
}
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
  map.on("load",()=>map.resize());
  map.on("click",e=>{setMarker(e.lngLat.lng,e.lngLat.lat);reverseGeocode(e.lngLat.lat,e.lngLat.lng);});
  document.querySelector("#clear-point").addEventListener("click",clearPoint);
  document.querySelector("#save-point").addEventListener("click",()=>{
    if(!marker)return;
    const p=marker.getLngLat();
    localStorage.setItem("observatorio-real-last-point",JSON.stringify({lat:p.lat,lng:p.lng,at:new Date().toISOString(),address:addressEl.textContent,place:placeEl.textContent}));
    document.querySelector("#save-point").textContent="Guardado ✓";
    setTimeout(()=>document.querySelector("#save-point").textContent="Guardar punto",1400);
  });
  document.querySelector("#locate").addEventListener("click",()=>{
    if(!navigator.geolocation){alert("La ubicación no está disponible en este dispositivo.");return;}
    navigator.geolocation.getCurrentPosition(pos=>{
      const p={lat:pos.coords.latitude,lng:pos.coords.longitude};
      map.flyTo({center:[p.lng,p.lat],zoom:16,pitch:45,duration:800});
      setMarker(p.lng,p.lat);reverseGeocode(p.lat,p.lng);
    },()=>alert("No se pudo obtener la ubicación. Podés marcar el punto directamente sobre el mapa."),{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
  document.querySelector("#search-button").addEventListener("click",searchAddress);
  document.querySelector("#address-search").addEventListener("keydown",e=>{if(e.key==="Enter")searchAddress();});
}
init();