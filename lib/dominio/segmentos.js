// Segmento de cada ativo, só para exibir uma etiqueta ao lado do ticker.
// Lista fixa: ticker novo que não estiver aqui fica sem etiqueta (é só acrescentar).
// Cripto fica de fora: a própria classe já diz o que é.
const SEGMENTOS = {
  // FIIs
  XPML11: 'Shopping', VISC11: 'Shopping', HSML11: 'Shopping', MALL11: 'Shopping',
  BTLG11: 'Logística', BRCO11: 'Logística', LVBI11: 'Logística', HGLG11: 'Logística', XPLG11: 'Logística',
  KNRI11: 'Híbrido', ALZR11: 'Híbrido', HGRU11: 'Renda urbana', TRXF11: 'Renda urbana',
  PVBI11: 'Escritórios', HGRE11: 'Escritórios', JSRE11: 'Escritórios',
  KNCR11: 'Papel', MXRF11: 'Papel', KNIP11: 'Papel', HGCR11: 'Papel', CPTS11: 'Papel', KNSC11: 'Papel', IRDM11: 'Papel',
  // Ações
  CURY3: 'Construção civil', MDNE3: 'Construção civil', CYRE3: 'Construção civil', DIRR3: 'Construção civil',
  RECV3: 'Petróleo e gás', PETR3: 'Petróleo e gás', PETR4: 'Petróleo e gás', PRIO3: 'Petróleo e gás',
  VBBR3: 'Combustíveis', UGPA3: 'Combustíveis',
  WEGE3: 'Bens industriais', EMBR3: 'Bens industriais',
  VIVT3: 'Telecom', TIMS3: 'Telecom',
  LREN3: 'Varejo', MGLU3: 'Varejo',
  VALE3: 'Mineração',
  ITUB4: 'Bancos', BBAS3: 'Bancos', BBDC4: 'Bancos', SANB11: 'Bancos', BBSE3: 'Seguros',
  TAEE11: 'Energia elétrica', EGIE3: 'Energia elétrica', CMIG4: 'Energia elétrica', ELET3: 'Energia elétrica',
  SBSP3: 'Saneamento', ABEV3: 'Bebidas',
  // ETFs
  BOVA11: 'ETF Ibovespa', BOVV11: 'ETF Ibovespa', XBOV11: 'ETF Ibovespa', BOVX11: 'ETF Ibovespa',
  SMAL11: 'ETF Small caps', PIBB11: 'ETF IBrX-50', BRAX11: 'ETF IBrX-100', DIVO11: 'ETF Dividendos', ECOO11: 'ETF Carbono',
  IVVB11: 'ETF S&P 500', SPXI11: 'ETF S&P 500',
  VWRA11: 'ETF Global', WRLD11: 'ETF Global',
  B5P211: 'ETF Tesouro IPCA',
};

export function segmento(ticker) {
  return SEGMENTOS[String(ticker || '').toUpperCase()] || null;
}
