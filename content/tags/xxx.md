研究背景：
战场单兵气体痕量检测具有重要意义，对于xxxx有很大作用，其中，单兵呼气痕量气体检测具有xx的作用，能够xx，而战场生化毒剂具有xx的危害，因此研究其xxx的检测方式具有重要意义。当前，主要采用xx技术进行检测，这些技术主要具有xx的问题，导致了xx的后果，导致xx难以应用，而金属氧化物气体传感器具有xx的优势，能够xx，可以实现小型化，集成化，便携气体检测，因此，针对现有气体传感器在战场复杂背景及复杂高湿环境下选择性差、痕量检测灵敏度低及难以微型化以适应单兵穿戴等问题，研究xxx，实现xxx装备等的xxx性能。

基本概念及内涵

单兵在战场环境下，其呼吸中的痕量生物标志物气体（丙酮等）及暴露的生化毒剂（如沙林、芥子气等）的实时检测，对于非战斗减员预防、战地无创急救和单兵健康管理具有重大国防价值。然而，现有气体传感器在复杂背景气、高湿及温度剧变条件下，普遍存在选择性差、痕量灵敏度不足、难以微型化等问题，亟需从传感新机理和集成新架构两方面协同突破。
为了解决上述问题，本项目基于纳米限域效应的高选择性气体传感机理，利用气体在纳米尺度通道内扩散时分子量与管径结构的匹配关系，缓解复杂环境下干扰气体引起的误报问题，同时，通过敏感材料纳米结构的精确调控、阵列化异质多传感器集成以及多源动态信号特征提取，构建一体化智能态芯片，实现ppb级精准检测和30秒内快速预警响应，并对传感器进行集成设计，实现微型化，低功耗的可穿戴设计，为单兵生理状态监测与战场生存率提供核心底层硬件支撑。

应用需求与科学意义

在单兵呼气痕量生物标志物检测方面，现代战场中高强度运动、睡眠不足和心理压力等因素可能导致作战人员生理状态快速变化。传统心率、血氧和体温监测难以直接获得作战人员的详细代谢信息。呼气痕量生物标志物检测具有无创等特点，可在不影响行动的条件下补充反映机体代谢过程。Pugliese等发现，高强度运动过程中呼气异戊二烯和丙酮等挥发性物质会随负荷发生动态变化，表明呼气组分具有表征运动生理和代谢状态的潜力[1]；但Bovey等的研究也表明，呼气丙酮同时受到饮食、空腹时间以及个体差异影响[2]。 因此，单兵呼气检测不宜依赖单一气体和固定阈值，而应发展多组分阵列检测、个体基线校准和时间序列分析方法，从而提高对代谢异常、疲劳风险和生理负荷变化的识别能力。其直接应用需求是将原本依赖采样袋、预浓缩装置和质谱分析的呼气检测过程转化为可嵌入面罩、头盔或胸前模块的低功耗传感节点，实现单兵状态的原位、动态和无创感知。

研究现状

在呼气痕量气体检测方面，基于气相色谱—质谱、选择离子流动管质谱和质子转移反应质谱等原理的质谱仪具有组分鉴别能力强、定量准确等优势，是当前呼气痕量气体检测研究的重要手段，然而这些设备体积较大、功耗较高，难以满足单兵战场实时检测需求。近年来，金属氧化物半导体气体传感器在微型化高精度气体检测中表现出较大潜力。Righettoni等研制的Si掺杂WO₃丙酮传感器实现了约20 ppb检测下限，并在80%～90%相对湿度条件下完成呼气测试[6]；Güntner等将Si:WO₃纳米颗粒传感器集成到便携呼气检测装置中，实验显示传感器能够检测1～66 ppm范围内的呼气丙酮变化，其结果与质谱测量及血液β-羟基丁酸变化总体一致[25]；Liu等通过Pt@In₂O₃纳米线与分子筛过滤层组合，实现了10 ppb量级的丙酮检测，并开展了真实呼气样本验证[7]；Kim等制备了负载Pt、Pd和Rh纳米催化剂的介孔WO₃纳米纤维，通过改变催化剂种调节器件对丙酮、甲苯和H₂S等标志物的响应特征，在湿润气氛下实现了ppb级响应[26]；Güntner等进一步在硅基微型基底上直接沉积Pt、Si、Pd和Ti掺杂的SnO₂薄膜，组成四通道金属氧化物阵列，并在90%相对湿度和混合气体背景下实现了低至3 ppb的甲醛检测，并可保持24 h稳定响应[27]；Dong等将金属氧化物传感器与扩散分离和湿度补偿结合，实现了多种湿度下的气体检测[8]。Shin等在WO₃纳米纤维中加入Na和Pt，制备了Pt/Na₂W₄O₁₃/WO₃多界面结构，用于检测呼气中的痕量乙醇，该器件在80例真实呼气检测中，传感结果与气相色谱检测的一致性为86.3%，且不需要吸附管或过滤装置[30]。上述研究表明，金属氧化物器件用于ppb级呼气检测具有可行性，然而当前多数研究仍依赖xx设计，距离高适度环境下高精度气体检测、多组分、较长时间佩戴条件下的稳定响应仍有差距。

在化学战剂检测方面，基于离子迁移谱、火焰光度检测、傅里叶变换红外光谱等技术的便携式光谱仪是当前多国部队列装的主要选择。例如，德国Bruker公司的RAID-M100采用离子迁移谱检测化学战剂和有毒工业化学品，该产品已列入德国国防部采购清单。日本防卫省2025年度采购了462台LCD4离子迁移谱检测器，用于日本陆上自卫队的化学战剂检测。上述装备能够完成战场化学战剂检测，但其体积、功耗仍难以满足单兵可穿戴检测需求。近年来，研究者开始采用金属氧化物MEMS气体传感器进行化学战剂检测。美国国家标准与技术研究院研究利用TiO₂与SnO₂薄膜构建MEMS阵列，在干燥空气条件下对GA、GB和HD等化学战剂进行了5～200 ppb范围的检测，验证了阵列识别的可行性[9]；Bigiani等利用Au/Mn₃O₄复合材料实现了对氮芥化学战剂模拟物的ppb级响应，同时研究了多种干扰物对检测精度的影响[10]。

相关工作说明金属氧化物传感器对化学战剂具有足够的灵敏度潜力，但已有高性能结果较多是在干燥空气、单一目标和有限干扰物条件下获得的。真实战场中的湿度波动、燃油与发动机尾气、烟雾以及防护装备内部高湿微环境，会引起基线漂移、竞争吸附和误报警，因此实验室“能够响应”尚不能直接等同于战场环境中的可靠识别。

综上所属，现有研究尚未形成面向高湿呼气与复杂战场背景气体环境、兼顾选择性、灵敏度、长期稳定性和低功耗的芯片级完整集成方案。因此，本项目拟围绕纳米限域输运与界面反应机理、异质多传感器阵列集成、湿度与背景干扰解耦、人工智能识别及阵列通道优化开展研究，实现对单兵特征生理气体和典型化学战剂的ppb级精准检测与快速预警，提升单兵可穿戴生理监测和化学防护装备的微型化、智能化及复杂环境适应能力。

参考文献

[1] PUGLIESE G, TAVANTI E, URBANI L, et al. Real-time analysis of volatile organic compounds in exhaled breath during exercise[J]. Frontiers in Physiology, 2022, 13: 946401. DOI:10.3389/fphys.2022.946401.

[2] BOVEY F, DELOMED M, COHEN M, et al. Breath acetone as a marker of energy balance: an exploratory study in healthy humans[J]. Nutrition & Diabetes, 2018, 8: 50. DOI:10.1038/s41387-018-0058-5.

[3] CENTERS FOR DISEASE CONTROL AND PREVENTION. Cyanide: chemical fact sheet[EB/OL]. [2026-09-08]. https://www.cdc.gov/chemical-emergencies/chemical-fact-sheets/cyanide.html
.

[4] CENTERS FOR DISEASE CONTROL AND PREVENTION. Sulfur mustard: chemical fact sheet[EB/OL]. [2026-09-08]. https://www.cdc.gov/chemical-emergencies/chemical-fact-sheets/sulfur-mustard.html
.

[5] JOINT PROGRAM EXECUTIVE OFFICE FOR CHEMICAL, BIOLOGICAL, RADIOLOGICAL AND NUCLEAR DEFENSE. FY25 capabilities catalog[R/OL]. 2025[2026-09-08]. https://www.jpeocbrnd.osd.mil/Portals/90/Documents/FY25%20Capabilities%20Catalog.pdf
.

[6] RIGHETTONI M, TRICOLI A, GASS S, et al. Breath acetone monitoring by portable Si:WO₃ gas sensors[J]. Analytica Chimica Acta, 2012, 738: 69-75. DOI:10.1016/j.aca.2012.06.002.

[7] LIU D, LIN L, CHEN Q, et al. Low power consumption gas sensor created from silicon nanowires/TiO₂ core-shell heterojunctions[J]. NPG Asia Materials, 2018, 10: 293-308. DOI:10.1038/s41427-018-0029-2.

[8] DONG C, LIU X, HAN B, et al. Breath acetone sensing based on metal oxide semiconductor sensors and a diffusion-separation structure[J]. Frontiers in Bioengineering and Biotechnology, 2022, 10: 861950. DOI:10.3389/fbioe.2022.861950.

[9] MEIER D C, TAYLOR C J, CAVICCHI R E, et al. Chemical warfare agent detection using MEMS microsensor arrays[EB/OL]. 2005-08-01[2026-09-08]. https://www.nist.gov/publications/chemical-warfare-agent-detection-using-mems-microsensor-arrays
.

[10] BIGIANI L, ZAPPETTINI A, QUARANTA A, et al. Au/Mn₃O₄ nanocomposites for ppb-level detection of a nitrogen mustard gas simulant[J]. ACS Applied Materials & Interfaces, 2019, 11(26): 23692-23700. DOI:10.1021/acsami.9b04875.

[11] JO Y K, SEO J H, PARK J, et al. Molecular sieving of gases by a nanoporous membrane for highly selective gas sensing[J]. Nature Communications, 2021, 12: 4955. DOI:10.1038/s41467-021-25290-3.

[12] BAIER M, ANTHOFER M H, LANG S, et al. Molecular-sieving ZIF-71/In-SnO₂ bilayers for selective gas sensing under humid conditions[J]. ACS Sensors, 2025, 10(8): 5664-5673. DOI:10.1021/acssensors.5c00770.

[13] SUH J M, SHIM Y S, KWON K C, et al. Portable and wireless gas sensing module with flexible asymmetric patterns and fully integrated sensor array[J]. Sensors and Actuators B: Chemical, 2018, 265: 660-667. DOI:10.1016/j.snb.2018.03.099.

[14] KIM J, LEE J, PARK J, et al. Ultralow-power artificial olfactory sensor using a single metal-oxide sensor, temperature modulation, and convolutional neural networks[J]. ACS Sensors, 2024, 9(7): 3557-3572. DOI:10.1021/acssensors.4c00471.

[15] WÖRNER M, DIETRICH M, BASTUCK M, et al. Long-term dataset of a metal-oxide gas-sensor array for drift-aware machine learning[J]. Scientific Data, 2025, 12: 1628. DOI:10.1038/s41597-025-05993-8.

[16] SANDIA NATIONAL LABORATORIES. Portable chemical sensors for environmental and state of health monitoring[R/OL]. [2026-09-08]. https://www.sandia.gov/app/uploads/sites/163/2021/11/Portable-Chemical-Sensors.pdf
.

[17] BOSCH SENSORTEC. BME688 gas sensor with artificial intelligence[EB/OL]. [2026-09-08]. https://www.bosch-sensortec.com/products/environmental-sensors/gas-sensors/bme688/
.

[18] OWLSTONE MEDICAL. ReCIVA breath sampler[EB/OL]. [2026-09-08]. https://www.owlstonemedical.com/products/reciva/
.

[19] INFICON. HAPSITE ER chemical identification system[EB/OL]. [2026-09-08]. https://www.inficon.com/en/products/chemical-detection-and-identification/hapsite-er
.

[20] BRUKER. RAID-M100 chemical agent detector[EB/OL]. [2026-09-08]. https://www.bruker.com/en/products-and-solutions/cbrne-detectors/ims/raid-m-100.html
.

[21] SMITHS DETECTION. Smiths Detection awarded $45 million contract for JCAD chemical threat detectors[EB/OL]. 2019[2026-09-08]. https://www.smithsdetection.com/press-releases/
.

[22] SMITHS DETECTION. Smiths Detection supplies LCD4 chemical detectors to Japan Ministry of Defense[EB/OL]. 2025[2026-09-08]. https://www.smithsdetection.com/press-releases/
.

[23] PROENGIN. AP4C: chemical warfare agents and toxic industrial chemicals detector[EB/OL]. [2026-09-08]. https://www.proengin.com/products/ap4c/
.

[25] GÜNTNER A T, KOMPALLA J F, LANDIS H, et al. Guiding ketogenic diet with breath acetone sensors[J]. Sensors, 2018, 18(11): 3655. DOI: 10.3390/s18113655
.
[26] KIM S J, CHOI S J, JANG J S, et al. Mesoporous WO₃ nanofibers with protein-templated nanoscale catalysts for detection of trace biomarkers in exhaled breath[J]. ACS Nano, 2016, 10(6): 5891-5899. DOI: 10.1021/acsnano.6b01196
.

[27] GÜNTNER A T, KOREN V, CHIKKADI K, et al. E-nose sensing of low-ppb formaldehyde in gas mixtures at high relative humidity for breath screening of lung cancer?[J]. ACS Sensors, 2016, 1(5): 528-535. DOI: 10.1021/acssensors.6b00008
.
[30] SHIN H, KIM D H, JUNG W, et al. Surface activity-tuned metal oxide chemiresistor: toward direct and quantitative halitosis diagnosis[J]. ACS Nano, 2021, 15(9): 14207-14217. DOI: 10.1021/acsnano.1c01350
.