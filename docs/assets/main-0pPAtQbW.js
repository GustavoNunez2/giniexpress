import{c as v}from"./index-CMzVDswU.js";const w="https://ehxsodyuzpduggxbffmk.supabase.co",b="sb_publishable_uy1GN_7GdX5y-D-WwWnB3w_NFUJHT-S",I=v(w,b);let u=[],a=JSON.parse(localStorage.getItem("cart_pro"))||[];const k="./assets/fallback-imagen.svg";function E(e=""){if(!e)return!0;const t=e.toLowerCase();return t.includes("placeholder-product.jpg")||t.includes("/placeholder/")||t.includes("no-image")||t.includes("image-not-found")||t.includes("sin-imagen")}function g(e){return e!=null&&e.pendingPreviewUrl?e.pendingPreviewUrl:!(e!=null&&e.imagen_url)||E(e.imagen_url)?k:e.imagen_url}async function C(){(localStorage.getItem("gini_theme")||"light")==="dark"&&document.documentElement.classList.add("dark"),p(),lucide.createIcons(),B(),await L(),s(),A()}function B(){document.getElementById("openCart").onclick=c,document.getElementById("closeCart").onclick=c,document.getElementById("cartOverlay").onclick=c,document.getElementById("closeModal").onclick=r,document.getElementById("productModal").onclick=e=>{e.target===document.getElementById("productModal")&&r()},document.getElementById("checkoutBtn").onclick=x,document.getElementById("searchInput").oninput=d,document.getElementById("sortSelect").onchange=d,document.getElementById("themeToggle").onclick=f}function f(){var t,o,n;document.documentElement.classList.contains("dark")?(document.documentElement.classList.remove("dark"),document.documentElement.style.colorScheme="light",localStorage.setItem("gini_theme","light")):(document.documentElement.classList.add("dark"),document.documentElement.style.colorScheme="dark",localStorage.setItem("gini_theme","dark")),p(),(n=(o=(t=window.tailwind)==null?void 0:t.preflightStyleSheet)==null?void 0:o.remove)==null||n.call(o)}function p(){const e=document.getElementById("themeToggle");if(!e)return;const t=document.documentElement.classList.contains("dark");e.innerHTML=t?'<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>':'<i data-lucide="moon" class="w-4 h-4"></i>',lucide.createIcons()}async function L(){try{const{data:e,error:t}=await I.from("productos").select("*").order("created_at",{ascending:!1});if(t)throw t;u=e,d()}catch(e){console.error("Error fetching products:",e)}}function d(){const e=document.getElementById("searchInput").value.toLowerCase().trim(),t=document.getElementById("sortSelect").value;let o=u.filter(n=>n.titulo.toLowerCase().includes(e));t==="price-asc"?o.sort((n,l)=>(n.precio||0)-(l.precio||0)):t==="price-desc"?o.sort((n,l)=>(l.precio||0)-(n.precio||0)):t==="name-asc"?o.sort((n,l)=>n.titulo.localeCompare(l.titulo)):t==="name-desc"&&o.sort((n,l)=>l.titulo.localeCompare(n.titulo)),$(o)}function $(e){const t=document.getElementById("productGrid"),o=document.getElementById("productCount");if(e.length===0){t.innerHTML=`
                    <div class="col-span-full py-24 flex flex-col items-center text-center text-slate-400">
                        <div class="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <i data-lucide="search-x" class="w-5 h-5 text-slate-400"></i>
                        </div>
                            <h4 class="text-sm font-bold text-slate-800 dark:text-white">No hay coincidencias</h4>
                    </div>
                `,o.textContent="0 PRODUCTOS",lucide.createIcons();return}o.textContent=`${e.length} PRODUCTOS`,t.innerHTML=e.map((n,l)=>`
                <div class="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg transition-all shadow-sm hover:shadow-md flex flex-col overflow-hidden fade-in" style="animation-delay: ${l*.01}s">
                    <div class="relative bg-slate-50 dark:bg-slate-900 aspect-square cursor-pointer overflow-hidden group" onclick="openProductDetail(${n.id})">
                        <img src="${g(n)}" alt="${n.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <span class="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-1.5 rounded-full text-[10px] font-bold shadow-xl">Vista rápida</span>
                        </div>
                    </div>
                    <div class="p-3 flex flex-col flex-1">
                        <h4 class="font-bold text-slate-900 dark:text-white mb-0.5 leading-tight line-clamp-1 text-sm capitalize">${n.titulo}</h4>
                        <p class="text-slate-400 dark:text-slate-300 text-[11px] mb-3 line-clamp-1 leading-relaxed">${n.descripcion||"Sin descripción"}</p>
                        <div class="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-2">

    <span class="text-sm font-bold text-slate-900 dark:text-white">
        $${(n.precio||0).toLocaleString()}
    </span>

    <div class="flex items-center justify-between gap-2">

        <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-1 shrink-0"
            onclick="event.stopPropagation();">

            <button onclick="changeQtyInGrid(${n.id}, -1)"
                class="w-6 h-7 flex items-center justify-center font-bold">
                -
            </button>

            <input type="number"
                id="qty-${n.id}"
                value="1"
                min="1"
                readonly
                class="w-5 text-center text-sm font-bold border-none bg-transparent pointer-events-none">

            <button onclick="changeQtyInGrid(${n.id}, 1)"
                class="w-6 h-7 flex items-center justify-center font-bold">
                +
            </button>
        </div>

        <button
            onclick="event.stopPropagation(); addToCart(${n.id}, parseInt(document.getElementById('qty-${n.id}').value))"
            class="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shrink-0">

            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
        </button>

    </div>
</div>
</div>
                    </div>
                </div>
            `).join(""),requestAnimationFrame(()=>{lucide.createIcons()})}function s(){const e=document.getElementById("cartItems"),t=document.getElementById("cartTotal"),o=document.getElementById("cartCount");let n=0,l=0;if(a.length===0){e.innerHTML='<div class="h-full flex items-center justify-center text-slate-400 text-sm">Bolsa vacía</div>',t.textContent="$0",o.textContent="0",o.classList.add("hidden");return}e.innerHTML=a.map(i=>(n+=(i.precio||0)*i.qty,l+=i.qty,`
    <div class="flex gap-4 justify-between items-start">
            <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                <img src="${g(i)}" class="w-full h-full object-cover">
            </div>
        <div class="flex-1 min-w-0">
            <h5 class="font-bold text-sm text-slate-900 dark:text-white truncate cart-item-title" title="${i.titulo}">${i.titulo}</h5>
            <p class="text-[10px] text-slate-400 dark:text-slate-300 uppercase">${i.qty} x $${i.precio}</p>
            <div class="flex items-center justify-between mt-1">
                <div class="flex items-center gap-2">
                    <button onclick="updateCartQty(${i.id}, -1)" class="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">-</button>
                    <span class="text-slate-900 dark:text-white">${i.qty}</span>
                    <button onclick="updateCartQty(${i.id}, 1)" class="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">+</button>
                </div>
            </div>
        </div>
        <button onclick="removeFromCart(${i.id})" class="cart-item-delete" title="Eliminar">×</button>
    </div>`)).join(""),t.textContent=`$${n.toLocaleString()}`,o.textContent=l,o.classList.remove("hidden"),lucide.createIcons()}function h(e,t){const o=u.find(l=>l.id===e);if(!o)return;const n=a.find(l=>l.id===e);n?n.qty+=t:a.push({...o,qty:t}),m(),s(),Q()}function S(e,t){const o=a.findIndex(n=>n.id===e);o!==-1&&(a[o].qty+=t,a[o].qty<=0&&a.splice(o,1),m(),s())}function M(e){a=a.filter(t=>t.id!==e),m(),s()}function T(){if(a.length===0)return;document.getElementById("confirmModal").classList.replace("hidden","visible")}function y(){document.getElementById("confirmModal").classList.replace("visible","hidden")}function _(){a=[],m(),s(),y()}function m(){localStorage.setItem("cart_pro",JSON.stringify(a))}function c(){const e=document.getElementById("cartDrawer"),t=document.getElementById("cartOverlay");e.classList.contains("closed")?(e.classList.replace("closed","open"),t.classList.replace("opacity-0","opacity-100"),t.classList.remove("pointer-events-none"),document.body.style.overflow="hidden"):(e.classList.replace("open","closed"),t.classList.replace("opacity-100","opacity-0"),t.classList.add("pointer-events-none"),document.body.style.overflow="auto")}function P(e){const t=u.find(n=>n.id===e);if(!t)return;document.getElementById("modalImg").src=g(t),document.getElementById("modalTitle").textContent=t.titulo,document.getElementById("modalPrice").textContent=`$${(t.precio||0).toLocaleString()}`,document.getElementById("modalDescription").textContent=t.descripcion||"Sin descripción detallada disponible.",document.getElementById("modalQty").value=1,document.getElementById("productModal").classList.replace("hidden","visible"),document.body.style.overflow="hidden",document.getElementById("modalAddBtn").onclick=()=>{h(t.id,parseInt(document.getElementById("modalQty").value)),r()}}function r(){document.getElementById("productModal").classList.replace("visible","hidden"),document.body.style.overflow="auto"}function q(e){const t=document.getElementById("modalQty");let o=parseInt(t.value)+e;o<1&&(o=1),t.value=o}function j(e,t){const o=document.getElementById(`qty-${e}`);let n=parseInt(o.value)+t;n<1&&(n=1),o.value=n}function x(){if(a.length===0)return alert("El carrito está vacío");let e=0,t=`Hola! Me interesa realizar el siguiente pedido:

`;a.forEach(n=>{e+=(n.precio||0)*n.qty,t+=`*${n.qty}x* ${n.titulo} ($${(n.precio||0).toLocaleString()})
`}),t+=`
*Total:* $${e.toLocaleString()}`;const o=`https://wa.me/5493513278986?text=${encodeURIComponent(t)}`;window.open(o,"_blank","noopener,noreferrer")}function A(){document.getElementById("whatsappFloating").href=`https://wa.me/5493513278986?text=${encodeURIComponent("Hola, tengo una consulta...")}`}function Q(){const e=document.getElementById("openCart");e.classList.add("scale-110"),setTimeout(()=>e.classList.remove("scale-110"),300)}C();window.openProductDetail=P;window.updateModalQty=q;window.changeQtyInGrid=j;window.addToCart=h;window.toggleCart=c;window.closeModal=r;window.removeFromCart=M;window.updateCartQty=S;window.finalizeOrder=x;window.handleSearchAndSort=d;window.toggleTheme=f;window.openConfirmModal=T;window.closeConfirmModal=y;window.executeClearCart=_;
