const CENTER=[-58.515,-34.526];
const STORAGE="observatorio-real-points";
let map=null,marker=null,selectedPoint=null,activeCategory="all";
const card=document.querySelector("#point-card"),categoryCard=document.querySelector("#category-card");
const coords=document.querySelector("#coords"),addressEl=document.querySelector("#address"),placeEl=document.querySelector("#place");
const categories=[
 {id:"transito",icon:"🚦",name:"Tránsito",color:"#258bd6",sub:["Bache","Vehículo mal estacionado","Semáforo fuera de servicio","Señalización dañada","Obstrucción de calzada"]},
 {id:"residuos",icon:"♻",name:"Residuos",color:"#6b8e23",sub:["Residuos / basura acumulada","Basura reiterada","Recolección no realizada","Microbasural"]},
 {id:"defensa-civil",icon:"⚠",name:"Defensa Civil / Riesgo",color:"#d67b25",sub:["Cable caído","Poste peligroso","Árbol caído","Inundación","Situación de riesgo"]},
 {id:"alumbrado",icon:"☼",name:"Alumbrado",color:"#d6a925",sub:["Luz apagada","Artefacto dañado","Poste de alumbrado dañado"]},
 {id:"espacios-verdes",icon:"♧",name:"Espacios verdes",color:"#3d9b62",sub:["Rama peligrosa","Poda necesaria","Espacio verde deteriorado"]},
 {id:"accesibilidad",icon:"♿",name:"Accesibilidad",color:"#7b61a8",sub:["Rampa bloqueada","Vereda inaccesible","Obstáculo para movilidad"]},
 {id:"infraestructura",icon:"⌂",name:"Infraestructura",color:"#7b8794",sub:["Vereda rota","Obra deteriorada","Mobiliario urbano dañado"]},
 {id:"agua",icon:"≈",name:"Agua / saneamiento",color:"#2499b5",sub:["Pérdida de agua","Aniego / inundación","Desagüe obstruido"]},
 {id:"servicios",icon:"◎",name:"Servicios",color:"#a05a9b",sub:["Servicio no realizado","Problema reiterado","Incumplimiento de servicio"]},
 {id:"seguridad",icon:"◉",name:"Seguridad / incidentes",color:"#b84a4a",sub:["Robo","Intento de robo","Hurto","Daño a propiedad","Incidente en transporte público","Zona con reiteración de incidentes"]}
];
function loadPoints(){try{return JSON.parse(localStorage.getItem(STORAGE)||"[]")}catch{return[]}}
function savePoints(points){localStorage.setItem(STORAGE,JSON.stringify(points))}
function makeId(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)}
function showPoint(p){coords.textContent=`Coordenadas: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`;card.classList.remove("hidden")}
function clearPoint(){if(marker){marker.remove();marker=null}selectedPoint=null;card.classList.add("hidden");categoryCard.classList.add("hidden")}
function setMarker(lng,lat){if(marker)marker.remove();marker=new maplibregl.Marker({color:"#258bd6"}).setLngLat([lng,lat]).addTo(map);selectedPoint={lat,lng};showPoint({lat,lng})}
async function reverseGeocode(lat,lng){
 try{const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
 const res=await fetch(url,{headers:{Accept:"application/json"}});if(!res.ok)throw new Error();
 const data=await res.json();addressEl.textContent=data.display_name||"Dirección no disponible";
 const a=data.address||{},locality=a.city||a.town||a.village||a.municipality||"",district=a.county||a.state_district||"";
 placeEl.textContent=[locality,district].filter(Boolean).join(" · ");
 }catch{addressEl.textContent="Dirección no disponible";placeEl.textContent=""}
}
function categoryUI(){
 const grid=document.querySelector("#category-grid");grid.innerHTML="";
 categories.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="category-button";
 b.innerHTML='<span class="category-icon">'+c.icon+'</span><span>'+c.name+'</span>';
 b.addEventListener("click",()=>openSubcategory(c));grid.appendChild(b)})
}
function openSubcategory(category){
 const grid=document.querySelector("#category-grid");
 grid.innerHTML='<div class="subcategory-head"><button type="button" id="back-categories">←</button><strong>'+category.name+'</strong></div>';
 category.sub.forEach(name=>{const b=document.createElement("button");b.type="button";b.className="subcategory-button";b.textContent=name;b.addEventListener("click",()=>publishPoint(category,name));grid.appendChild(b)});
 document.querySelector("#back-categories").addEventListener("click",categoryUI);
}
function publishPoint(category,subtype){
 if(!selectedPoint)return;
 const now=new Date().toISOString(),points=loadPoints();
 const p={id:makeId(),createdAt:now,updatedAt:now,lat:selectedPoint.lat,lng:selectedPoint.lng,address:addressEl.textContent,place:placeEl.textContent,category:category.id,categoryName:category.name,subtype:subtype,status:"reportado",source:"aporte_ciudadano",evidence:[],history:[{at:now,type:"status",value:"reportado",source:"aporte_ciudadano"}]};
 points.push(p);savePoints(points);categoryCard.classList.add("hidden");card.classList.add("hidden");
 if(marker){marker.remove();marker=null}selectedPoint=null;refreshReports();refreshDashboard();refreshHistory();
 document.querySelector("#mapa").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderCategoryFilter(){
 const wrap=document.querySelector("#category-filter"); if(!wrap)return;
 wrap.innerHTML="";
 const all=document.createElement("button"); all.type="button"; all.className="filter-chip active"; all.textContent="Todos";
 all.dataset.category="all"; wrap.appendChild(all);
 categories.forEach(c=>{const b=document.createElement("button");b.type="button";b.className="filter-chip";b.textContent=c.name;b.dataset.category=c.id;b.style.setProperty("--chip-color",c.color);wrap.appendChild(b)});
 wrap.addEventListener("click",e=>{const b=e.target.closest(".filter-chip");if(!b)return;activeCategory=b.dataset.category;wrap.querySelectorAll(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));refreshReports();applyMapFilter()},{once:true});
}
function applyMapFilter(){
 if(!map)return;
 categories.forEach(cat=>{
   const visible=activeCategory==="all"||activeCategory===cat.id;
   ["report-clusters-"+cat.id,"report-cluster-count-"+cat.id,"report-points-"+cat.id].forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,"visibility",visible?"visible":"none")});
 });
}
function refreshReports(){
 if(!map||!map.isStyleLoaded())return;
 const points=loadPoints();
 categories.forEach(cat=>{
   const features=points.filter(p=>p.category===cat.id).map(p=>({type:"Feature",geometry:{type:"Point",coordinates:[p.lng,p.lat]},properties:{id:p.id,category:p.categoryName,status:p.status,categoryId:p.category}}));
   const src=map.getSource("reports-"+cat.id); if(src)src.setData({type:"FeatureCollection",features});
 });
}
function addReportLayers(){
 if(categories.some(cat=>map.getSource("reports-"+cat.id)))return;
 categories.forEach(cat=>{
   const sourceId="reports-"+cat.id,clusterId="report-clusters-"+cat.id,countId="report-cluster-count-"+cat.id,pointsId="report-points-"+cat.id;
   map.addSource(sourceId,{type:"geojson",data:{type:"FeatureCollection",features:[]},cluster:true,clusterMaxZoom:16,clusterRadius:48});
   map.addLayer({id:clusterId,type:"circle",source:sourceId,filter:["has","point_count"],paint:{"circle-radius":["step",["get","point_count"],20,10,26,50,32],"circle-color":cat.color,"circle-opacity":.9,"circle-stroke-width":2,"circle-stroke-color":"#fff"}});
   map.addLayer({id:countId,type:"symbol",source:sourceId,filter:["has","point_count"],layout:{"text-field":["get","point_count_abbreviated"],"text-size":12},paint:{"text-color":"#fff"}});
   map.addLayer({id:pointsId,type:"circle",source:sourceId,filter:["!",["has","point_count"]],paint:{"circle-radius":7,"circle-color":cat.color,"circle-stroke-color":"#fff","circle-stroke-width":2}});
   map.on("click",clusterId,e=>{const f=map.queryRenderedFeatures(e.point,{layers:[clusterId]})[0];map.getSource(sourceId).getClusterExpansionZoom(f.properties.cluster_id,(err,zoom)=>{if(!err)map.easeTo({center:f.geometry.coordinates,zoom})})});
   map.on("click",pointsId,e=>{const p=e.features[0].properties,item=loadPoints().find(x=>x.id===p.id);if(item)map.flyTo({center:[item.lng,item.lat],zoom:17})});
 });
}
function refreshDashboard(){
 const points=loadPoints(),open=points.filter(p=>p.status!=="resuelto").length,resolved=points.filter(p=>p.status==="resuelto").length;
 document.querySelector("#stat-total").textContent=points.length;document.querySelector("#stat-open").textContent=open;
 document.querySelector("#stat-resolved").textContent=resolved;document.querySelector("#stat-categories").textContent=new Set(points.map(p=>p.category)).size;
 const counts={};points.forEach(p=>counts[p.categoryName]=(counts[p.categoryName]||0)+1);
 document.querySelector("#category-summary").innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name,n])=>`<span><b>${n}</b> ${name}</span>`).join("")||"<span>Sin publicaciones todavía.</span>";
}
function fmtDate(iso){return new Intl.DateTimeFormat("es-AR",{dateStyle:"short",timeStyle:"short"}).format(new Date(iso))}
function refreshHistory(){
 const list=document.querySelector("#history-list"),points=loadPoints().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 if(!points.length){list.innerHTML='<div class="empty-state">Todavía no hay puntos publicados.</div>';return}
 list.innerHTML=points.map(p=>`<article class="history-card"><div class="history-main"><strong>${p.categoryName}</strong><small>${p.subtype||""}</small><span class="status-pill">${p.status}</span><small>${p.address||"Ubicación sin dirección"}</small><small>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}</small></div><div class="timeline">${p.history.map(e=>`<div><b>${e.value}</b><span>${fmtDate(e.at)} · ${e.source}</span></div>`).join("")}</div></article>`).join("");
}
async function searchAddress(){
 const input=document.querySelector("#address-search"),results=document.querySelector("#search-results"),q=input.value.trim();if(!q)return;
 results.classList.remove("hidden");results.textContent="Buscando…";
 try{const query=q.toLowerCase().includes("argentina")?q:`${q}, Argentina`;
 const res=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,{headers:{Accept:"application/json"}});
 if(!res.ok)throw new Error();const data=await res.json();results.innerHTML="";
 if(!data.length){results.textContent="No encontramos esa dirección.";return}
 data.forEach(item=>{const b=document.createElement("button");b.type="button";b.textContent=item.display_name;b.addEventListener("click",()=>{const lng=Number(item.lon),lat=Number(item.lat);map.flyTo({center:[lng,lat],zoom:17,pitch:35,duration:800});setMarker(lng,lat);reverseGeocode(lat,lng);results.classList.add("hidden")});results.appendChild(b)})
 }catch{results.textContent="No se pudo buscar ahora. Podés marcar el punto directamente en el mapa."}
}
function init(){
 if(typeof maplibregl==="undefined"){document.querySelector("#map").innerHTML="<div class='map-error'>No se pudo cargar el motor del mapa.</div>";return}
 categoryUI();renderCategoryFilter();
 map=new maplibregl.Map({container:"map",style:"https://tiles.openfreemap.org/styles/liberty",center:CENTER,zoom:13,pitch:35,bearing:0,attributionControl:true,cooperativeGestures:false});
 map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");map.on("error",e=>console.warn("MapLibre:",e.error||e));
 map.on("load",()=>{map.resize();addReportLayers();refreshReports();applyMapFilter()});
 map.on("click",e=>{if(e.defaultPrevented)return;setMarker(e.lngLat.lng,e.lngLat.lat);reverseGeocode(e.lngLat.lat,e.lngLat.lng)});
 document.querySelector("#clear-point").addEventListener("click",clearPoint);
 document.querySelector("#close-category").addEventListener("click",()=>categoryCard.classList.add("hidden"));
 document.querySelector("#save-point").addEventListener("click",()=>{if(!marker)return;categoryCard.classList.remove("hidden")});
 document.querySelector("#locate").addEventListener("click",()=>{if(!navigator.geolocation){alert("La ubicación no está disponible en este dispositivo.");return}navigator.geolocation.getCurrentPosition(pos=>{const p={lat:pos.coords.latitude,lng:pos.coords.longitude};map.flyTo({center:[p.lng,p.lat],zoom:16,pitch:45,duration:800});setMarker(p.lng,p.lat);reverseGeocode(p.lat,p.lng)},()=>alert("No se pudo obtener la ubicación. Podés marcar el punto directamente sobre el mapa."),{enableHighAccuracy:true,timeout:10000,maximumAge:60000})});
 document.querySelector("#search-button").addEventListener("click",searchAddress);const brand=document.querySelector("#brand-toggle");if(brand)brand.addEventListener("click",e=>{e.preventDefault();const expanded=brand.getAttribute("aria-expanded")==="true";brand.setAttribute("aria-expanded",String(!expanded))});
 document.querySelector("#address-search").addEventListener("keydown",e=>{if(e.key==="Enter")searchAddress()});
 refreshDashboard();refreshHistory();
}
init();