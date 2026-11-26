import { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Btn, Card, CardMenu, Check, Empty, Field, FormSheet, Input, Muted, PriorityBadge, Row, Screen, Seg, s, usePalette, useResponsive } from "../../../src/lib/ui";
import { delWish, money, normalizePriority, PRIORITY_OPTIONS, saveWish, uid, useStore, Wish, WishPriority } from "../../../src/lib/store";
import { haptic } from "../../../src/haptics";

const CATEGORIES = ["Tech", "Workspace", "Home", "Books", "Clothing", "Travel"];
const PRI_LABEL: Record<WishPriority, string> = { high: "High Priority", medium: "Medium Priority", low: "Low Priority" };
const PRI_SCORE: Record<WishPriority, number> = { low: 1, medium: 2, high: 4 };

const FIELDS: Field[] = [
  { k: "name", label: "Item name", required: true },
  { k: "price", label: "Estimated price", numeric: true },
  { k: "priority", label: "Priority", options: PRIORITY_OPTIONS, optionLabels: PRI_LABEL },
  {
    k: "category",
    label: "Category",
    placeholder: "Tech, Workspace, Home...",
    presets: CATEGORIES.map((c) => ({ label: c, value: c })),
  },
  { k: "url", label: "Product link" },
  { k: "desc", label: "Description", multiline: true },
  { k: "notes", label: "Notes", multiline: true },
];

export default function Wishlist() {
  const { wishlist, currency } = useStore();
  const p = usePalette();
  const r = useResponsive();
  const [tab, setTab] = useState<"all" | "active" | "bought">("active");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<"priority" | "price_asc" | "price_desc" | "alpha">("priority");
  const [q, setQ] = useState("");
  const [budget, setBudget] = useState("");
  const [pickCat, setPickCat] = useState<string>("all");
  const [edit, setEdit] = useState<Wish | "new" | null>(null);
  const [shown, setShown] = useState<Wish | null>(null);
  const [spin, setSpin] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const act = wishlist.filter((w) => !w.purchased);
  const bought = wishlist.filter((w) => w.purchased);
  const estCost = act.reduce((a, w) => a + w.price, 0);
  const acqCost = bought.reduce((a, w) => a + w.price, 0);

  const cats = Array.from(new Set(wishlist.map((w) => w.category.trim()).filter(Boolean)));

  const list = wishlist
    .filter((w) => (tab === "all" ? true : tab === "active" ? !w.purchased : w.purchased))
    .filter((w) => (cat === "all" ? true : w.category.trim() === cat))
    .filter((w) => (w.name + w.category + w.notes + w.desc).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "alpha") return a.name.localeCompare(b.name);
      return PRI_SCORE[b.priority] - PRI_SCORE[a.priority];
    });

  const maxB = budget.trim() ? Number(budget.trim()) : Infinity;
  const pool = act.filter((w) => (pickCat === "all" ? true : w.category.trim() === pickCat) && (Number.isFinite(maxB) ? w.price <= maxB : true));

  const pick = () => {
    if (!pool.length) return;
    if (timer.current) clearInterval(timer.current);
    const weighted: Wish[] = [];
    for (const item of pool) {
      const weight = PRI_SCORE[item.priority] ?? 2;
      for (let k = 0; k < weight; k++) weighted.push(item);
    }
    const final = weighted[Math.floor(Math.random() * weighted.length)];
    let i = 0; setSpin(true);
    timer.current = setInterval(() => {
      if (++i > 14 || pool.length === 1) {
        clearInterval(timer.current!);
        timer.current = null;
        setShown(final);
        setSpin(false);
        haptic.success();
      } else {
        setShown(pool[i % pool.length]);
        haptic.selection();
      }
    }, 80);
  };

  const cur = shown && act.find((w) => w.id === shown.id);
  const kpis: [string | number, string][] = [
    [wishlist.length, "total items"],
    [act.length, "remaining"],
    [money(estCost, currency), "estimated cost"],
    [money(acqCost, currency), "acquired cost"],
  ];

  return (
    <Screen title="Wishlist" sub={`${money(estCost, currency)} across ${act.length} unpurchased`}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {kpis.map(([val, lbl]) => (
          <View key={lbl} style={[s.card, { backgroundColor: p.s1, borderColor: p.line, flexBasis: "47%", flexGrow: 1, marginBottom: 0 }]}>
            <Text style={{ color: p.tx, fontSize: r.compact ? 17 : 20, fontWeight: "600" }} numberOfLines={1} adjustsFontSizeToFit>{val}</Text>
            <Muted t={lbl} />
          </View>
        ))}
      </View>

      <View style={[s.card, { backgroundColor: p.s1, borderColor: p.line, padding: 18, marginTop: 12 }]}>
        <Text style={{ color: p.ac, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 }}>PICK FOR ME</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Input
            style={{ flex: 1 }}
            placeholder={`Max budget (${currency})`}
            keyboardType="decimal-pad"
            value={budget}
            onChangeText={setBudget}
          />
        </View>
        {cats.length ? (
          <Seg opts={[["all", "Any category"], ...cats.map((c) => [c, c] as [string, string])]} value={pickCat} on={setPickCat} />
        ) : null}
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <Text style={{ color: p.tx, fontSize: 22, fontWeight: "600", minHeight: 30, opacity: spin ? 0.5 : 1 }} accessibilityLiveRegion="polite">
            {cur ? cur.name : act.length ? (pool.length ? "Ready to pick" : "No items fit budget/category") : "Your wishlist is empty"}
          </Text>
          <Text style={{ color: p.ac, fontSize: 18, minHeight: 24 }}>{cur && !spin ? `${money(cur.price, currency)} · ${PRI_LABEL[cur.priority]}` : ""}</Text>
          <Row>
            <Btn label={cur && !spin ? "Pick again" : "Pick for me"} onPress={pick} disabled={!pool.length || spin} />
            {cur && !spin ? <Btn label="Mark purchased" kind="ghost" onPress={() => { void saveWish({ ...cur, purchased: true }); setShown(null); haptic.success(); }} /> : null}
            {cur && !spin && cur.url ? <Btn label="Open link" kind="ghost" onPress={() => Linking.openURL(cur.url).catch(() => {})} /> : null}
          </Row>
        </View>
      </View>

      <Row><Btn label="Add item" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["active", "Unpurchased"], ["bought", "Purchased"], ["all", "All"]]} value={tab} on={setTab} />
      {cats.length ? <Seg opts={[["all", "All categories"], ...cats.map((c) => [c, c] as [string, string])]} value={cat} on={setCat} /> : null}
      <Input placeholder="Search wishlist" value={q} onChangeText={setQ} />
      <Seg opts={[["priority", "Priority"], ["price_asc", "Price ↑"], ["price_desc", "Price ↓"], ["alpha", "A–Z"]]} value={sort} on={setSort} />

      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((w) => (
          <Card key={w.id} done={w.purchased} accent={!w.purchased && w.priority === "high" ? p.bad : !w.purchased && w.priority === "medium" ? p.ac : undefined}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Check on={w.purchased} label={`${w.purchased ? "Restore" : "Mark purchased"} ${w.name}`} onPress={() => saveWish({ ...w, purchased: !w.purchased })} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: p.tx, fontWeight: "500" }}>{w.name}</Text>
                  <PriorityBadge priority={w.priority} />
                </View>
                {w.desc ? <Muted t={w.desc} /> : null}
                <Muted t={[money(w.price, currency), w.category].filter(Boolean).join(" · ")} />
                {w.notes ? <Muted t={`Note: ${w.notes}`} /> : null}
                {w.url ? <Text style={{ color: p.ac, fontSize: 13 }} onPress={() => Linking.openURL(w.url).catch(() => {})}>Open link</Text> : null}
              </View>
              <CardMenu label={w.name} onEdit={() => setEdit(w)} onDelete={() => delWish(w.id)} />
            </View>
          </Card>
        )) : <Empty t="Nothing here" sub={tab === "active" ? "Save things you plan to buy." : "Items matching this filter appear here."} />}
      </View>

      {edit ? (
        <FormSheet
          title={edit === "new" ? "New item" : "Edit item"}
          fields={FIELDS}
          initial={edit === "new" ? { priority: "medium" } : { ...edit, price: String(edit.price || "") } as any}
          onClose={() => setEdit(null)}
          onSave={(v) => {
            const rawPrice = v.price?.trim() ?? "";
            const price = rawPrice ? Number(rawPrice) : 0;
            if (rawPrice && (!Number.isFinite(price) || price < 0)) return "Enter a valid non-negative price.";
            const url = v.url?.trim() ? (/^https?:\/\//i.test(v.url.trim()) ? v.url.trim() : "https://" + v.url.trim()) : "";
            void saveWish({
              id: edit === "new" ? uid() : edit.id,
              purchased: edit === "new" ? false : edit.purchased,
              name: v.name.trim(),
              desc: v.desc ?? "",
              price,
              url,
              category: v.category?.trim() ?? "",
              priority: normalizePriority(v.priority),
              notes: v.notes?.trim() ?? "",
            });
            setEdit(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
