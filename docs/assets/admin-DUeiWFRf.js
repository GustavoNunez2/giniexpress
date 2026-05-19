import{c as v}from"./index-CMzVDswU.js";const w="https://ehxsodyuzpduggxbffmk.supabase.co",E="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",c=v(w,E);let d=[];async function x(){lucide.createIcons();const{data:{session:e}}=await c.auth.getSession();e?h(e.user):y(),I()}function I(){document.getElementById("loginForm").onsubmit=B,document.getElementById("logoutBtn").onclick=L,document.getElementById("addProductForm").onsubmit=k,document.getElementById("applyBulkBtn").onclick=_,document.getElementById("adminSearchInput").oninput=f,c.auth.onAuthStateChange((e,t)=>{e==="SIGNED_IN"&&h(t.user),e==="SIGNED_OUT"&&y()})}async function B(e){e.preventDefault();const t=document.getElementById("email").value,o=document.getElementById("password").value,n=document.getElementById("loginBtn");n.classList.add("btn-loading"),n.innerHTML='<span class="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></span> Entrando...';const{error:s}=await c.auth.signInWithPassword({email:t,password:o});s&&(alert("Error de acceso: "+s.message),n.classList.remove("btn-loading"),n.innerHTML='Ingresar <i data-lucide="arrow-right" class="w-4 h-4"></i>',lucide.createIcons())}async function L(){confirm("¿Deseas cerrar la sesión?")&&await c.auth.signOut()}function y(){document.getElementById("loginSection").classList.remove("hidden"),document.getElementById("adminPanel").classList.add("hidden")}function h(e){document.getElementById("loginSection").classList.add("hidden"),document.getElementById("adminPanel").classList.remove("hidden"),document.getElementById("userEmail").textContent=e.email,i()}function m(e){document.querySelectorAll(".tab-content").forEach(t=>t.classList.remove("active")),document.getElementById(e).classList.add("active"),document.querySelectorAll(".nav-tab").forEach(t=>{t.classList.remove("bg-black","text-white"),t.classList.add("text-gray-500","hover:bg-gray-100"),t.dataset.tab===e&&(t.classList.add("bg-black","text-white"),t.classList.remove("text-gray-500","hover:bg-gray-100"))})}async function i(){try{const{data:e,error:t}=await c.from("productos").select("*").order("created_at",{ascending:!1});if(t)throw t;d=e,b(d),document.getElementById("adminSearchInput").value=""}catch(e){console.error(e),r("Error al cargar inventario","red")}}function b(e=d){const t=document.getElementById("inventoryTable"),o=document.getElementById("productCount");if(o.textContent=`${e.length} ITEMS`,e.length===0){t.innerHTML=`
                    <tr>
                        <td colspan="6" class="px-8 py-16 text-center text-slate-400 text-sm">
                            No se encontraron productos que coincidan con la búsqueda.
                        </td>
                    </tr>
                `;return}t.innerHTML=e.map((n,s)=>`
                <tr class="hover:bg-gray-50/50 transition-colors group">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <img src="${n.imagen_url}" class="w-10 h-10 object-cover rounded-lg bg-gray-100 border border-gray-100">
                            <div>
                                <span class="block font-bold text-sm text-slate-800">${n.titulo}</span>
                                <span class="block text-[10px] text-gray-400 mono">ID: ${n.id}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-xs font-semibold text-slate-500 mono">$${(n.precio_costo||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-1">
                            <input type="number" id="margin-${n.id}" value="${n.porcentaje_ganancia||15}" class="w-16 bg-transparent border-b border-transparent focus:border-black focus:outline-none py-1 mono font-medium text-center">
                            <span class="text-slate-300 font-bold">%</span>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="text-sm font-bold text-slate-900 mono">$${(n.precio||0).toLocaleString()}</span>
                    </td>
                    <td class="px-6 py-4">
                        <textarea id="desc-${n.id}" class="w-full bg-transparent border-b border-transparent focus:border-black focus:outline-none py-1 text-xs text-gray-500 resize-none leading-relaxed" rows="1">${n.descripcion||""}</textarea>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="updateProduct(${n.id})" class="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all shadow-lg shadow-black/10">
                                <i data-lucide="save" class="w-4 h-4"></i>
                            </button>
                            <button onclick="deleteProduct(${n.id})" class="p-2 border border-gray-100 bg-white text-gray-400 hover:text-red-500 hover:border-red-100 rounded-lg transition-all">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join(""),lucide.createIcons(),document.querySelectorAll('textarea[id^="desc-"]').forEach(n=>{n.style.height="auto",n.style.height=n.scrollHeight+"px",n.addEventListener("input",()=>{n.style.height="auto",n.style.height=n.scrollHeight+"px"})})}function f(){const e=document.getElementById("adminSearchInput").value.toLowerCase().trim(),t=d.filter(o=>o.titulo.toLowerCase().includes(e));b(t)}async function P(e){if(!d.find(u=>u.id===e))return;const o=parseFloat(document.getElementById(`margin-${e}`).value)||0,n=document.getElementById(`desc-${e}`).value,s=p.precio_costo||0,a=Math.round(s*(1+o/100)),{error:l}=await c.from("productos").update({porcentaje_ganancia:o,precio:a,descripcion:n}).eq("id",e);l?r("Error: "+l.message,"red"):(r("Producto actualizado"),i())}async function S(e){if(!confirm("¿Estás seguro de eliminar este producto?"))return;const{error:t}=await c.from("productos").delete().eq("id",e);t?r("Error: "+t.message,"red"):(r("Producto eliminado"),i())}async function k(e){e.preventDefault();const t=document.getElementById("addTitle").value,o=parseFloat(document.getElementById("addPrice").value),n=document.getElementById("addImageUrl").value,s=document.getElementById("addDescription").value,a=document.getElementById("submitProductBtn"),l=15,u=Math.round(o*(1+l/100));a.classList.add("btn-loading"),a.innerHTML="Creando...";const{error:g}=await c.from("productos").insert([{titulo:t,precio_costo:o,porcentaje_ganancia:l,precio:u,imagen_url:n,descripcion:s}]);g?(r("Error: "+g.message,"red"),a.classList.remove("btn-loading"),a.innerHTML='<i data-lucide="plus" class="w-4 h-4"></i> Crear Ítem',lucide.createIcons()):(r("Producto creado con éxito"),e.target.reset(),a.classList.remove("btn-loading"),a.innerHTML='<i data-lucide="plus" class="w-4 h-4"></i> Crear Ítem',lucide.createIcons(),i(),m("inventory"))}async function _(){const e=parseFloat(document.getElementById("bulkPercent").value);if(isNaN(e))return alert("Ingresa un porcentaje válido");if(!confirm(`¿Estás seguro de fijar el margen de TODO el catálogo al ${e}%?`))return;const t=document.getElementById("applyBulkBtn");t.classList.add("btn-loading"),t.innerHTML="Procesando ajuste...";try{const o=d.map(n=>{const s=n.precio_costo||0,a=Math.round(s*(1+e/100));return c.from("productos").update({porcentaje_ganancia:e,precio:a}).eq("id",n.id)});await Promise.all(o),r(`¡Margen del ${e}% aplicado a todo!`),i(),m("inventory")}catch{r("Error en actualización masiva","red")}finally{t.classList.remove("btn-loading"),t.innerHTML='<i data-lucide="zap" class="w-4 h-4"></i> Aplicar a Todo',lucide.createIcons()}}function r(e,t="black"){const o=document.getElementById("toast");o.textContent=e,o.style.backgroundColor=t==="red"?"#ef4444":"#000000",o.classList.replace("translate-y-20","translate-y-0"),o.classList.replace("opacity-0","opacity-100"),setTimeout(()=>{o.classList.replace("translate-y-0","translate-y-20"),o.classList.replace("opacity-100","opacity-0")},3e3)}x();window.showTab=m;window.fetchProducts=i;window.updateProduct=P;window.deleteProduct=S;window.handleAdminSearch=f;
