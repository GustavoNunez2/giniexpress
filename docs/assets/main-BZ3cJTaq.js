import{c as x}from"./index-CMzVDswU.js";const v="https://ehxsodyuzpduggxbffmk.supabase.co",h="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",b=x(v,h);let r=[],c=JSON.parse(localStorage.getItem("cart_pro"))||[];async function w(){lucide.createIcons(),I(),await E(),u(),k()}function I(){document.getElementById("openCart").onclick=s,document.getElementById("closeCart").onclick=s,document.getElementById("cartOverlay").onclick=s,document.getElementById("closeModal").onclick=d,document.getElementById("productModal").onclick=e=>{e.target===document.getElementById("productModal")&&d()},document.getElementById("checkoutBtn").onclick=y,document.getElementById("searchInput").oninput=i,document.getElementById("sortSelect").onchange=i}async function E(){try{const{data:e,error:t}=await b.from("productos").select("*").order("created_at",{ascending:!1});if(t)throw t;r=e,i()}catch(e){console.error("Error fetching products:",e),document.getElementById("productGrid").innerHTML=`
                    <div class="col-span-full py-20 text-center text-red-500">
                        <p>Ups! No pudimos cargar los productos.</p>
                    </div>
                `}}function i(){const e=document.getElementById("searchInput").value.toLowerCase().trim(),t=document.getElementById("sortSelect").value;let o=r.filter(n=>n.titulo.toLowerCase().includes(e));t==="price-asc"?o.sort((n,l)=>(n.precio||0)-(l.precio||0)):t==="price-desc"?o.sort((n,l)=>(l.precio||0)-(n.precio||0)):t==="name-asc"?o.sort((n,l)=>n.titulo.localeCompare(l.titulo)):t==="name-desc"&&o.sort((n,l)=>l.titulo.localeCompare(n.titulo)),B(o)}function B(e){const t=document.getElementById("productGrid"),o=document.getElementById("productCount");if(e.length===0){t.innerHTML=`
                    <div class="col-span-full py-24 flex flex-col items-center text-center text-slate-400">
                        <div class="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="search-x" class="w-5 h-5 text-slate-400"></i>
                        </div>
                        <h4 class="text-sm font-bold text-slate-800">No hay coincidencias</h4>
                    </div>
                `,o.textContent="0 PRODUCTOS",lucide.createIcons();return}o.textContent=`${e.length} PRODUCTOS`,t.innerHTML=e.map((n,l)=>`
                <div class="card-minimal flex flex-col overflow-hidden fade-in" style="animation-delay: ${l*.01}s">
                    <div class="relative bg-slate-50 aspect-square cursor-pointer overflow-hidden group" onclick="openProductDetail(${n.id})">
                        <img src="${n.imagen_url}" alt="${n.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <span class="bg-white text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl">Quick View</span>
                        </div>
                    </div>
                    <div class="p-3 flex flex-col flex-1">
                        <h4 class="font-bold text-slate-900 mb-0.5 leading-tight line-clamp-1 text-xs capitalize">${n.titulo}</h4>
                        <p class="text-slate-400 text-[11px] mb-3 line-clamp-1 leading-relaxed">${n.descripcion||"Sin descripción"}</p>
                        
                        <div class="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-900">$${(n.precio||0).toLocaleString()}</span>
                            
                            <div class="flex items-center gap-1.5">
                                <div class="qty-minimal flex items-center gap-1.5">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, -1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">-</button>
                                    <input type="number" id="qty-${n.id}" value="1" min="1" class="w-5 text-center text-[11px] font-bold border-none focus:ring-0 p-0 bg-transparent" onclick="event.stopPropagation()">
                                    <button onclick="event.stopPropagation(); changeQtyInGrid(${n.id}, 1)" class="w-5 h-5 flex items-center justify-center font-bold text-slate-400 hover:text-slate-900 transition-colors text-xs">+</button>
                                </div>
                                <button onclick="event.stopPropagation(); addToCart(${n.id}, parseInt(document.getElementById('qty-${n.id}').value))" class="btn-primary p-2 rounded-lg">
                                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join(""),lucide.createIcons()}function u(){const e=document.getElementById("cartItems"),t=document.getElementById("cartTotal"),o=document.getElementById("cartCount");if(c.length===0){e.innerHTML=`
                    <div class="h-full flex flex-col items-center justify-center text-slate-300 text-center">
                        <p class="text-sm font-medium">Bolsa vacía</p>
                    </div>
                `,t.textContent="$0",o.classList.add("hidden");return}let n=0,l=0;e.innerHTML=c.map(a=>{const m=(a.precio||0)*a.qty;return n+=m,l+=a.qty,`
                <div class="flex gap-4 group">
                    <div class="w-14 h-14 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border">
                        <img src="${a.imagen_url}" alt="${a.titulo}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start mb-1">
                            <h5 class="font-bold text-xs text-slate-900 truncate leading-none capitalize">${a.titulo}</h5>
                            <button onclick="removeFromCart(${a.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <p class="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">${a.qty} x $${(a.precio||0).toLocaleString()}</p>
                        <div class="flex items-center justify-between">
                             <div class="qty-minimal flex items-center gap-1.5 px-1 py-0.5">
                                <button onclick="updateCartQty(${a.id}, -1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">-</button>
                                <span class="text-[10px] font-bold text-slate-900 w-3 text-center">${a.qty}</span>
                                <button onclick="updateCartQty(${a.id}, 1)" class="w-4 h-4 flex items-center justify-center text-[10px] text-slate-400 hover:text-slate-900">+</button>
                            </div>
                            <span class="text-xs font-bold text-slate-900">$${m.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                `}).join(""),t.textContent=`$${n.toLocaleString()}`,o.textContent=l,o.classList.remove("hidden"),lucide.createIcons()}function f(e,t){const o=r.find(l=>l.id===e);if(!o)return;const n=c.find(l=>l.id===e);n?n.qty+=t:c.push({...o,qty:t}),p(),u(),q()}function C(e,t){const o=c.find(n=>n.id===e);o&&(o.qty+=t,o.qty<=0?g(e):(p(),u()))}function g(e){c=c.filter(t=>t.id!==e),p(),u()}function p(){localStorage.setItem("cart_pro",JSON.stringify(c))}function s(){const e=document.getElementById("cartDrawer"),t=document.getElementById("cartOverlay");e.classList.contains("closed")?(e.classList.replace("closed","open"),t.classList.replace("opacity-0","opacity-100"),t.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(e.classList.replace("open","closed"),t.classList.replace("opacity-100","opacity-0"),t.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function $(e){const t=r.find(n=>n.id===e);if(!t)return;document.getElementById("modalImg").src=t.imagen_url,document.getElementById("modalTitle").textContent=t.titulo,document.getElementById("modalPrice").textContent=`$${(t.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=t.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{f(t.id,parseInt(document.getElementById("modalQty").value)),d()}}function d(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function L(e){const t=document.getElementById("modalQty");let o=parseInt(t.value)+e;o<1&&(o=1),t.value=o}function S(e,t){const o=document.getElementById(`qty-${e}`);let n=parseInt(o.value)+t;n<1&&(n=1),o.value=n}function y(){if(c.length===0)return alert("El carrito está vacío");let e=0,t=`Hola! Me interesa realizar el siguiente pedido:

`;c.forEach(o=>{e+=(o.precio||0)*o.qty,t+=`*${o.qty}x* ${o.titulo} ($${(o.precio||0).toLocaleString()})
`}),t+=`
*Total:* $${e.toLocaleString()}`,window.open(`https://wa.me/5493513278986?text=${encodeURIComponent(t)}`,"_blank")}function k(){document.getElementById("whatsappFloating").href=`https://wa.me/5493513278986?text=${encodeURIComponent("Hola, tengo una consulta...")}`}function q(){const e=document.getElementById("openCart");e.classList.add("scale-110"),setTimeout(()=>e.classList.remove("scale-110"),300)}w();window.openProductDetail=$;window.updateModalQty=L;window.changeQtyInGrid=S;window.addToCart=f;window.toggleCart=s;window.closeModal=d;window.removeFromCart=g;window.updateCartQty=C;window.finalizeOrder=y;window.handleSearchAndSort=i;
