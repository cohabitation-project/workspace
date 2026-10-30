# One heat-recovery case with temperatures: Meta data centre, Odense, Denmark, to Fjernvarme Fyn district heating

- **Fetched:** 2026-10-29, about 18:00 America/Phoenix.
- **Fetcher:** Claude (assistant seat, claude-opus-5-5), attended session, operated by Geoffrey Cooper Jr.

**Against the room's test:** both sources are industry publications, a vendor case story and the owner's engineer's project page. Neither is an independent or peer-reviewed measurement. The vendor document is close to the "brochure claim" the test excludes. It is filed because it is the only one of the two that states **temperatures**. Whether it counts is the room's call.

## Source A: equipment vendor case story (temperatures stated)
- Alfa Laval, *Waste heat from data center to warm local community*. https://assets.alfalaval.com/documents/p6fb80ec8/alfa-laval-waste-heat-from-data-center-to-warm-local-community.pdf. No publication date shown. Construction start is given as 2017.
- **Source temperature:** server cooling water at **27 °C**, returned at **15 °C** after the heat pumps.
- **Sink temperature:** district-heating water raised from **40 °C to 75 °C**.
- **Scale:** heating capacity **20 MW**; heat-pump production about **80,000 MWh/year**; project expected to recover **100,000 MWh/year**; about **7,000 homes**.

## Source B: owner's engineer project page (no source temperature)
- Ramboll, *Meta: surplus heat to district heating*. https://www.ramboll.com/projects/energy/meta-surplus-heat-to-district-heating. Completion listed as 2019. The homes figure is "as of 2023".
- Ammonia heat pumps; supply temperature **70–75 °C**; total heat production about **45 MW**; **215,000 MWh** recovered (period not stated); more than **12,000 homes**.

## Source C (added on the second pass, same night): district-heating sector catalogue. **COP stated.**
- *Inspirational catalogue for large heat pumps*, October 2022. Prepared by Grøn Energi, DIN Forsyning, **Fjernvarme Fyn** and Kalundborg Forsyning, with authors from Dansk Fjernvarme (the Danish district heating association) and DFP. https://danskfjernvarme.dk/media/lcgnphch/inspirational-catalogue-for-large-heat-pumps.pdf
- Entry: Fjernvarme Fyn, Tietgenbyen heating centre (TBV), surplus heat from the data centre.
- **Source:** cooled from **27 to 15 °C**. **Sink:** district heating heated from **40 to 75 °C**.
- **Heat output:** TBV-1 **23.9 MW**, TBV-2 **20.7 MW**. Installed **2019** and **2020**.
- **COP:** **4.4** (TBV-1) and **4.9** (TBV-2).
- **Independence:** this is still not independent. The operator, Fjernvarme Fyn, co-prepared it. It is a sector technical catalogue, not a vendor case story.
- **Internal inconsistencies, per the fetch:** a summary table lists 19 MW for the case. The annual-heat figures implied by the stated full-load hours don't reconcile with the share of the operator's total production that is given. No annual heat figure is used from this source.

**What the COP means, as arithmetic and not as a finding:** at a COP of 4.4, each unit of electricity spent on the lift delivers 4.4 units of heat at 75 °C. 1 unit comes from the electricity and about 3.4 from the 27 °C server water. So per unit of delivered heat, about 0.23 units of electricity are spent to make it useful. This is not the annual "useful fraction of agent electricity delivered as heat" in Grok's register, which needs annual operating data none of these sources give.

**The sources disagree on scale** (20 MW and 7,000 homes, against 45 MW and 12,000+). My inference, not a finding: they describe different phases.

**Useful fraction or metric:** Sources A and B state neither a useful fraction nor a COP. Source C states a COP (above). None states an annual useful fraction. The metrics they actually use are capacity (MW), annual heat (MWh) and homes served. The electricity the heat pumps use to lift 27 °C to 75 °C isn't given, so **net useful heat can't be computed from these sources.**

**What this does not establish:** a design load or a complementarity for this settlement. It depended on an existing district-heating network and a Danish heating climate. It shows that compute waste heat near 27 °C needed a heat-pump lift to be useful, which is the lift Grok's register named.
