import { useEffect, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Btn, Card, CardMenu, C, Check, Empty, FormSheet, Input, Muted, Row, Screen, Seg, s } from "../../src/lib/ui";
import { delWish, money, saveWish, uid, useStore, Wish } from "../../src/lib/store";
import { haptic } from "../../src/haptics";

const FIELDS = [
  { k: "name", label: "Item name", required: true },
  { k: "desc", label: "Description", multiline: true },
  { k: "price", label: "Estimated price", numeric: true },
  { k: "url", label: "Product link" },
  { k: "category", label: "Category" },
  { k: "notes", label: "Acquisition notes", multiline: true },
];
export default function Wishlist() {
  const { wishlist, currency } = useStore();
  const [tab, setTab] = useState<"active" | "bought">("active");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Wish | "new" | null>(null);
  const [shown, setShown] = useState<Wish | null>(null);
  const [spin, setSpin] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const act = wishlist.filter((w) => !w.purchased);
  const bought = wishlist.filter((w) => w.purchased);
  const estCost = act.reduce((a, w) => a + w.price, 0);
  const acqCost = bought.reduce((a, w) => a + w.price, 0);
  const list = wishlist.filter((w) => (tab === "active" ? !w.purchased : w.purchased) && (w.name + w.category + w.notes).toLowerCase().includes(q.toLowerCase()));
  const pick = () => {
    if (!act.length) return;
    if (timer.current) clearInterval(timer.current);
    const final = act[Math.floor(Math.random() * act.length)];
    let i = 0; setSpin(true);
    timer.current = setInterval(() => {
      if (++i > 14 || act.length === 1) { clearInterval(timer.current!); timer.current = null; setShown(final); setSpin(false); haptic.success(); }
      else { setShown(act[i % act.length]); haptic.selection(); }
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
          <View key={lbl} style={[s.card, { width: "48%", marginBottom: 0 }]}>
            <Text style={{ color: C.tx, fontSize: 20, fontWeight: "600" }}>{val}</Text>
            <Muted t={lbl} />
          </View>
        ))}
      </View>
      <View style={[s.card, { alignItems: "center", padding: 22, marginTop: 12 }]}>
        <Muted t="Can’t decide what to buy?" />
        <Text style={{ color: C.tx, fontSize: 24, fontWeight: "600", marginTop: 10, minHeight: 34, opacity: spin ? 0.5 : 1 }} accessibilityLiveRegion="polite">{cur ? cur.name : act.length ? "" : "Your wishlist is empty"}</Text>
        <Text style={{ color: C.ac, fontSize: 20, minHeight: 28 }}>{cur && !spin ? money(cur.price, currency) : ""}</Text>
        <Row>
          <Btn label={cur && !spin ? "Pick again" : "Pick for me"} onPress={pick} disabled={!act.length || spin} />
          {cur && !spin ? <Btn label="Mark purchased" kind="ghost" onPress={() => { saveWish({ ...cur, purchased: true }); setShown(null); haptic.success(); }} /> : null}
          {cur && !spin && cur.url ? <Btn label="Open link" kind="ghost" onPress={() => Linking.openURL(cur.url).catch(() => {})} /> : null}
        </Row>
        {!act.length ? <Muted t="Add an item to use the picker." /> : null}
      </View>
      <Row><Btn label="Add item" onPress={() => setEdit("new")} /></Row>
      <Seg opts={[["active", "Unpurchased"], ["bought", "Purchased"]]} value={tab} on={setTab} />
      <Input placeholder="Search wishlist" value={q} onChangeText={setQ} />
      <View style={{ marginTop: 10 }}>
        {list.length ? list.map((w) => (
          <Card key={w.id} done={w.purchased}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Check on={w.purchased} label={`${w.purchased ? "Restore" : "Mark purchased"} ${w.name}`} onPress={() => saveWish({ ...w, purchased: !w.purchased })} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.tx }}>{w.name}</Text>{w.desc ? <Muted t={w.desc} /> : null}
                <Muted t={[money(w.price, currency), w.category].filter(Boolean).join(" · ")} />
                {w.notes ? <Muted t={`Note: ${w.notes}`} /> : null}
                {w.url ? <Text style={{ color: C.ac, fontSize: 13 }} onPress={() => Linking.openURL(w.url).catch(() => {})}>Open link</Text> : null}
              </View>
              <CardMenu label={w.name} onEdit={() => setEdit(w)} onDelete={() => delWish(w.id)} />
            </View>
          </Card>
        )) : <Empty t="Nothing here" sub={tab === "active" ? "Save things you plan to buy." : "Purchased items appear here. Tap the circle to restore one."} />}
      </View>
      {edit ? <FormSheet title={edit === "new" ? "New item" : "Edit item"} fields={FIELDS} initial={edit === "new" ? {} : { ...edit, price: String(edit.price || "") } as any}
        onClose={() => setEdit(null)} onSave={(v) => {
          const rawPrice = v.price?.trim() ?? "";
          const price = rawPrice ? Number(rawPrice) : 0;
          if (rawPrice && (!Number.isFinite(price) || price < 0)) return "Enter a valid non-negative price.";
          const url = v.url?.trim() ? (/^https?:\/\//i.test(v.url.trim()) ? v.url.trim() : "https://" + v.url.trim()) : "";
          saveWish({ id: edit === "new" ? uid() : edit.id, purchased: edit === "new" ? false : edit.purchased, name: v.name.trim(), desc: v.desc ?? "", price, url, category: v.category?.trim() ?? "", notes: v.notes?.trim() ?? "" });
          setEdit(null);
        }} /> : null}
    </Screen>
  );
}
