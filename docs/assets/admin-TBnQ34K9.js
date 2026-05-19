import{c as b}from"./index-CMzVDswU.js";const I="https://ehxsodyuzpduggxbffmk.supabase.co",B="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",i=b(I,B);let d=[];async function $(){(localStorage.getItem("admin_theme")||"light")==="dark"&&document.body.classList.add("dark-mode"),y(),lucide.createIcons();const{data:{session:o}}=await i.auth.getSession();o?h(o.user):f(),L()}function L(){document.getElementById("loginForm").onsubmit=j,document.getElementById("logoutBtn").onclick=P,document.getElementById("addProductForm").onsubmit=T,document.getElementById("applyBulkBtn").onclick=M,document.getElementById("adminSearchInput").oninput=w,document.getElementById("themeToggle").onclick=p}function p(){const e=document.body.classList.toggle("dark-mode");localStorage.setItem("admin_theme",e?"dark":"light"),y()}function y(){const e=document.getElementById("themeToggle");if(!e)return;const o=document.body.classList.contains("dark-mode");e.innerHTML=o?'<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>':'<i data-lucide="moon" class="w-4 h-4"></i>',lucide.createIcons()}async function j(e){e.preventDefault();const o=document.getElementById("email").value,t=document.getElementById("password").value,c=document.getElementById("loginBtn");c.innerHTML="Entrando...";const{error:a}=await i.auth.signInWithPassword({email:o,password:t});a&&(alert("Error: "+a.message),c.innerHTML="Comenzar sesión")}async function P(){confirm("¿Cerrar sesión?")&&await i.auth.signOut()}function f(){document.getElementById("loginSection").classList.remove("hidden"),document.getElementById("adminPanel").classList.add("hidden")}function h(e){document.getElementById("loginSection").classList.add("hidden"),document.getElementById("adminPanel").classList.remove("hidden"),document.getElementById("userEmail").textContent=e.email,l()}function m(e){document.querySelectorAll(".tab-content").forEach(o=>o.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-tab").forEach(o=>{o.classList.remove("bg-black","text-white"),o.classList.add("text-gray-500"),o.dataset.tab===e&&o.classList.add("bg-black","text-white")})}async function l(){try{const{data:e,error:o}=await i.from("productos").select("*").order("created_at",{ascending:!1});if(o)throw o;d=e,x(d)}catch{s("Error al cargar inventario","red")}}function x(e=d){const o=document.getElementById("inventoryTable");if(document.getElementById("productCount").textContent=`${e.length} ITEMS`,e.length===0){o.innerHTML='<tr><td colspan="6" class="px-8 py-16 text-center text-slate-400 text-sm">No hay coincidencias.</td></tr>';return}o.innerHTML=e.map(t=>`
                <tr class="hover:bg-gray-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${t.imagen_url}" class="w-10 h-10 object-cover rounded-lg border">
                            <div>
                                <span class="block font-bold text-sm text-slate-800">${t.titulo}</span>
                                <span class="block text-[10px] text-gray-400 mono">ID: ${t.id}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-semibold text-slate-500 mono">$${(t.precio_costo||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-col gap-1">
                            <select id="mode-${t.id}" onchange="toggleRowMode(${t.id})" class="text-[10px] font-bold bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer">
                                <option value="porcentaje" ${t.precio_fijo===null?"selected":""}>Por Porcentaje</option>
                                <option value="fijo" ${t.precio_fijo!==null?"selected":""}>Precio Fijo Manual</option>
                            </select>
                            
                            <div id="container-margin-${t.id}" class="${t.precio_fijo!==null?"hidden":"flex"} items-center gap-1 mt-1">
                                <input type="number" id="margin-${t.id}" value="${t.porcentaje_ganancia||15}" oninput="recalcRowPrice(${t.id})" class="w-12 border-b text-center text-xs mono">
                                <span class="text-slate-400 text-xs font-bold">%</span>
                            </div>

                            <div id="container-fijo-${t.id}" class="${t.precio_fijo===null?"hidden":"flex"} items-center gap-1 mt-1">
                                <span class="text-slate-400 text-xs font-bold">$</span>
                                <input type="number" id="fijo-${t.id}" value="${t.precio_fijo||t.precio||0}" oninput="recalcRowPrice(${t.id})" class="w-20 border-b text-left text-xs mono">
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span id="preview-precio-${t.id}" class="text-sm font-bold text-slate-900 mono">$${(t.precio||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <textarea id="desc-${t.id}" class="w-full bg-transparent border-b text-xs text-gray-500 resize-none" rows="1">${t.descripcion||""}</textarea>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="updateProduct(${t.id})" class="p-2 bg-black text-white rounded-lg shadow-md cursor-pointer">
                                <i data-lucide="save" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="deleteProduct(${t.id})" class="p-2 border text-gray-400 hover:text-red-500 rounded-lg cursor-pointer">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join(""),lucide.createIcons(),document.querySelectorAll('textarea[id^="desc-"]').forEach(t=>{t.style.height="auto",t.style.height=t.scrollHeight+"px",t.addEventListener("input",()=>{t.style.height="auto",t.style.height=t.scrollHeight+"px"})})}function _(e){const o=document.getElementById(`mode-${e}`).value;document.getElementById(`container-margin-${e}`).classList.toggle("hidden",o!=="porcentaje"),document.getElementById(`container-fijo-${e}`).classList.toggle("hidden",o!=="fijo"),v(e)}function v(e){const o=d.find(n=>n.id===e);if(!o)return;const t=document.getElementById(`mode-${e}`).value,c=document.getElementById(`preview-precio-${e}`),a=o.precio_costo||0;if(t==="porcentaje"){const n=parseFloat(document.getElementById(`margin-${e}`).value)||0;c.textContent=`$${Math.round(a*(1+n/100)).toLocaleString()}`}else{const n=parseFloat(document.getElementById(`fijo-${e}`).value)||0;c.textContent=`$${n.toLocaleString()}`}}function w(){const e=document.getElementById("adminSearchInput").value.toLowerCase().trim(),o=d.filter(t=>t.titulo.toLowerCase().includes(e));x(o)}async function S(e){const o=d.find(E=>E.id===e);if(!o)return;const t=document.getElementById(`mode-${e}`).value,c=document.getElementById(`desc-${e}`).value,a=o.precio_costo||0;let n=null,r=null,u=0;t==="porcentaje"?(n=parseFloat(document.getElementById(`margin-${e}`).value)||0,u=Math.round(a*(1+n/100))):(r=parseFloat(document.getElementById(`fijo-${e}`).value)||0,u=r,n=a>0?Math.round((r-a)/a*100):0);const{error:g}=await i.from("productos").update({porcentaje_ganancia:n,precio_fijo:r,precio:u,descripcion:c}).eq("id",e);g?s("Error: "+g.message,"red"):(s("Producto actualizado"),l())}async function k(e){if(!confirm("¿Eliminar producto?"))return;const{error:o}=await i.from("productos").delete().eq("id",e);o?s("Error: "+o.message,"red"):(s("Producto eliminado"),l())}async function T(e){e.preventDefault();const o=document.getElementById("addTitle").value,t=parseFloat(document.getElementById("addPrice").value),c=document.getElementById("addImageUrl").value,a=document.getElementById("addDescription").value,n=Math.round(t*1.15),{error:r}=await i.from("productos").insert([{titulo:o,precio_costo:t,porcentaje_ganancia:15,precio_fijo:null,precio:n,imagen_url:c,descripcion:a}]);r?s("Error: "+r.message,"red"):(s("Producto creado"),e.target.reset(),l(),m("inventory"))}async function M(){const e=parseFloat(document.getElementById("bulkPercent").value);if(isNaN(e))return alert("Ingresa un porcentaje válido");if(!confirm(`¿Fijar margen general al ${e}% en TODO el catálogo? (Esto removerá precios manuales)`))return;const o=document.getElementById("applyBulkBtn");o.innerHTML="Procesando...";try{const t=d.map(c=>{const a=c.precio_costo||0,n=Math.round(a*(1+e/100));return i.from("productos").update({porcentaje_ganancia:e,precio_fijo:null,precio:n}).eq("id",c.id)});await Promise.all(t),s("¡Ajuste global aplicado!"),l(),m("inventory")}catch{s("Error en actualización masiva","red")}finally{o.innerHTML='<i data-lucide="zap" class="w-4 h-4"></i> Aplicar Porcentaje Global',lucide.createIcons()}}function s(e,o="black"){const t=document.getElementById("toast");t.textContent=e,t.style.backgroundColor=o==="red"?"#ef4444":"#000000",t.classList.replace("translate-y-20","translate-y-0"),t.classList.replace("opacity-0","opacity-100"),setTimeout(()=>{t.classList.replace("translate-y-0","translate-y-20"),t.classList.replace("opacity-100","opacity-0")},3e3)}i.auth.onAuthStateChange((e,o)=>{e==="SIGNED_IN"&&h(o.user),e==="SIGNED_OUT"&&f()});$();window.showTab=m;window.fetchProducts=l;window.updateProduct=S;window.deleteProduct=k;window.toggleRowMode=_;window.recalcRowPrice=v;window.handleAdminSearch=w;window.toggleTheme=p;
