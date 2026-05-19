import{c as w}from"./index-CMzVDswU.js";const E="https://ehxsodyuzpduggxbffmk.supabase.co",b="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",s=w(E,b);let l=[];async function I(){lucide.createIcons();const{data:{session:t}}=await s.auth.getSession();t?y(t.user):g(),B()}function B(){document.getElementById("loginForm").onsubmit=$,document.getElementById("logoutBtn").onclick=j,document.getElementById("addProductForm").onsubmit=S,document.getElementById("applyBulkBtn").onclick=k,document.getElementById("adminSearchInput").oninput=x}async function $(t){t.preventDefault();const o=document.getElementById("email").value,e=document.getElementById("password").value,c=document.getElementById("loginBtn");c.innerHTML="Entrando...";const{error:a}=await s.auth.signInWithPassword({email:o,password:e});a&&(alert("Error: "+a.message),c.innerHTML="Comenzar sesión")}async function j(){confirm("¿Cerrar sesión?")&&await s.auth.signOut()}function g(){document.getElementById("loginSection").classList.remove("hidden"),document.getElementById("adminPanel").classList.add("hidden")}function y(t){document.getElementById("loginSection").classList.add("hidden"),document.getElementById("adminPanel").classList.remove("hidden"),document.getElementById("userEmail").textContent=t.email,d()}function m(t){document.querySelectorAll(".tab-content").forEach(o=>o.classList.remove("active")),document.getElementById(t).classList.add("active"),document.querySelectorAll(".nav-tab").forEach(o=>{o.classList.remove("bg-black","text-white"),o.classList.add("text-gray-500"),o.dataset.tab===t&&o.classList.add("bg-black","text-white")})}async function d(){try{const{data:t,error:o}=await s.from("productos").select("*").order("created_at",{ascending:!1});if(o)throw o;l=t,f(l)}catch{r("Error al cargar inventario","red")}}function f(t=l){const o=document.getElementById("inventoryTable");if(document.getElementById("productCount").textContent=`${t.length} ITEMS`,t.length===0){o.innerHTML='<tr><td colspan="6" class="px-8 py-16 text-center text-slate-400 text-sm">No hay coincidencias.</td></tr>';return}o.innerHTML=t.map(e=>`
                <tr class="hover:bg-gray-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${e.imagen_url}" class="w-10 h-10 object-cover rounded-lg border">
                            <div>
                                <span class="block font-bold text-sm text-slate-800">${e.titulo}</span>
                                <span class="block text-[10px] text-gray-400 mono">ID: ${e.id}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-semibold text-slate-500 mono">$${(e.precio_costo||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <select id="mode-${e.id}" onchange="toggleRowMode(${e.id})" class="text-[10px] font-bold bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer">
                                <option value="porcentaje" ${e.precio_fijo===null?"selected":""}>Por Porcentaje</option>
                                <option value="fijo" ${e.precio_fijo!==null?"selected":""}>Precio Fijo Manual</option>
                            </select>
                            
                            <div id="container-margin-${e.id}" class="${e.precio_fijo!==null?"hidden":"flex"} items-center gap-1 mt-1">
                                <input type="number" id="margin-${e.id}" value="${e.porcentaje_ganancia||15}" oninput="recalcRowPrice(${e.id})" class="w-12 border-b text-center text-xs mono">
                                <span class="text-slate-400 text-xs font-bold">%</span>
                            </div>

                            <div id="container-fijo-${e.id}" class="${e.precio_fijo===null?"hidden":"flex"} items-center gap-1 mt-1">
                                <span class="text-slate-400 text-xs font-bold">$</span>
                                <input type="number" id="fijo-${e.id}" value="${e.precio_fijo||e.precio||0}" oninput="recalcRowPrice(${e.id})" class="w-20 border-b text-left text-xs mono">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span id="preview-precio-${e.id}" class="text-sm font-bold text-slate-900 mono">$${(e.precio||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <textarea id="desc-${e.id}" class="w-full bg-transparent border-b text-xs text-gray-500 resize-none" rows="1">${e.descripcion||""}</textarea>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="updateProduct(${e.id})" class="p-2 bg-black text-white rounded-lg shadow-md cursor-pointer">
                                <i data-lucide="save" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="deleteProduct(${e.id})" class="p-2 border text-gray-400 hover:text-red-500 rounded-lg cursor-pointer">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join(""),lucide.createIcons(),document.querySelectorAll('textarea[id^="desc-"]').forEach(e=>{e.style.height="auto",e.style.height=e.scrollHeight+"px",e.addEventListener("input",()=>{e.style.height="auto",e.style.height=e.scrollHeight+"px"})})}function L(t){const o=document.getElementById(`mode-${t}`).value;document.getElementById(`container-margin-${t}`).classList.toggle("hidden",o!=="porcentaje"),document.getElementById(`container-fijo-${t}`).classList.toggle("hidden",o!=="fijo"),h(t)}function h(t){const o=l.find(n=>n.id===t);if(!o)return;const e=document.getElementById(`mode-${t}`).value,c=document.getElementById(`preview-precio-${t}`),a=o.precio_costo||0;if(e==="porcentaje"){const n=parseFloat(document.getElementById(`margin-${t}`).value)||0;c.textContent=`$${Math.round(a*(1+n/100)).toLocaleString()}`}else{const n=parseFloat(document.getElementById(`fijo-${t}`).value)||0;c.textContent=`$${n.toLocaleString()}`}}function x(){const t=document.getElementById("adminSearchInput").value.toLowerCase().trim(),o=l.filter(e=>e.titulo.toLowerCase().includes(t));f(o)}async function P(t){const o=l.find(v=>v.id===t);if(!o)return;const e=document.getElementById(`mode-${t}`).value,c=document.getElementById(`desc-${t}`).value,a=o.precio_costo||0;let n=null,i=null,u=0;e==="porcentaje"?(n=parseFloat(document.getElementById(`margin-${t}`).value)||0,u=Math.round(a*(1+n/100))):(i=parseFloat(document.getElementById(`fijo-${t}`).value)||0,u=i,n=a>0?Math.round((i-a)/a*100):0);const{error:p}=await s.from("productos").update({porcentaje_ganancia:n,precio_fijo:i,precio:u,descripcion:c}).eq("id",t);p?r("Error: "+p.message,"red"):(r("Producto actualizado"),d())}async function _(t){if(!confirm("¿Eliminar producto?"))return;const{error:o}=await s.from("productos").delete().eq("id",t);o?r("Error: "+o.message,"red"):(r("Producto eliminado"),d())}async function S(t){t.preventDefault();const o=document.getElementById("addTitle").value,e=parseFloat(document.getElementById("addPrice").value),c=document.getElementById("addImageUrl").value,a=document.getElementById("addDescription").value,n=Math.round(e*1.15),{error:i}=await s.from("productos").insert([{titulo:o,precio_costo:e,porcentaje_ganancia:15,precio_fijo:null,precio:n,imagen_url:c,descripcion:a}]);i?r("Error: "+i.message,"red"):(r("Producto creado"),t.target.reset(),d(),m("inventory"))}async function k(){const t=parseFloat(document.getElementById("bulkPercent").value);if(isNaN(t))return alert("Ingresa un porcentaje válido");if(!confirm(`¿Fijar margen general al ${t}% en TODO el catálogo? (Esto removerá precios manuales)`))return;const o=document.getElementById("applyBulkBtn");o.innerHTML="Procesando...";try{const e=l.map(c=>{const a=c.precio_costo||0,n=Math.round(a*(1+t/100));return s.from("productos").update({porcentaje_ganancia:t,precio_fijo:null,precio:n}).eq("id",c.id)});await Promise.all(e),r("¡Ajuste global aplicado!"),d(),m("inventory")}catch{r("Error en actualización masiva","red")}finally{o.innerHTML='<i data-lucide="zap" class="w-4 h-4"></i> Aplicar Porcentaje Global',lucide.createIcons()}}function r(t,o="black"){const e=document.getElementById("toast");e.textContent=t,e.style.backgroundColor=o==="red"?"#ef4444":"#000000",e.classList.replace("translate-y-20","translate-y-0"),e.classList.replace("opacity-0","opacity-100"),setTimeout(()=>{e.classList.replace("translate-y-0","translate-y-20"),e.classList.replace("opacity-100","opacity-0")},3e3)}s.auth.onAuthStateChange((t,o)=>{t==="SIGNED_IN"&&y(o.user),t==="SIGNED_OUT"&&g()});I();window.showTab=m;window.fetchProducts=d;window.updateProduct=P;window.deleteProduct=_;window.toggleRowMode=L;window.recalcRowPrice=h;window.handleAdminSearch=x;
