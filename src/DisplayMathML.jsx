import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import { MathMLToLaTeX } from "mathml-to-latex";
import { useState } from "react";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

function DangerousSetIn({ mathMLString }) {
  return <div style={{ textAlign: "center" }} dangerouslySetInnerHTML={{ __html: mathMLString }} />;
}
/*{<DangerousSetIn mathMLString={mathML} />}*/
export function DisplayMathML({ title, mathML, textResult, caclDone }) {
  const [latexToast, setLatexToast] = useState(false);
  const [mathMLToast, setMathMLToast] = useState(false);
  if (!caclDone) return null;
  return (
    <>
      <Snackbar open={latexToast} autoHideDuration={10000} onClose={() => setLatexToast(false)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <SnackbarContent
          sx={{ backgroundColor: "black" }}
          message={
            <>
              LaTeX copied to your clipboard. Here's a free online latex editor:
              <a className="text-white" href="https://latexeditor.lagrida.com/" target="_blank">
                https://latexeditor.lagrida.com/
              </a>
            </>
          }
        />
      </Snackbar>
      <Snackbar open={mathMLToast} autoHideDuration={10000} onClose={() => setMathMLToast(false)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <SnackbarContent
          sx={{ backgroundColor: "black" }}
          message={
            <>
              MathML copied to your clipboard. Here's a free online MathML editor:
              <a className="text-white" href="https://codepen.io/bqlou/pen/yOgbmb" target="_blank">
                https://codepen.io/bqlou/pen/yOgbmb
              </a>
            </>
          }
        />
      </Snackbar>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, sm: 10 }}>
          <Grid size={12} sx={{ my: 2 }}>
            <h3>{title}</h3>
          </Grid>
          <Grid size={12} style={{ overflow: "auto" }} sx={{ fontSize: "1.6em", minHeight: "55px" }}>
            <DangerousSetIn mathMLString={mathML} />
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, sm: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ py: 0, my: 0.5 }}
            onClick={() => {
              const newLatex = MathMLToLaTeX.convert(mathML);
              navigator.clipboard.writeText(newLatex);
              setLatexToast(true);
            }}
          >
            Copy LaTeX
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ py: 0, my: 0.5 }}
            onClick={() => {
              navigator.clipboard.writeText(mathML);
              setMathMLToast(true);
            }}
          >
            Copy MathML
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ py: 0, my: 0.5 }}
            onClick={() => {
              // const newLatex = MathML2LaTeX.convert(mathMlString);
              // name=="Laplace" ? navigator.clipboard.writeText(mathML) :navigator.clipboard.writeText(bilinear);;
              var encoded_latex = encodeURIComponent(textResult);
              var newURL = `https://www.wolframalpha.com/input?i2d=true&i=${encoded_latex}`;
              window.open(newURL, "_blank");
            }}
          >
            Wolfram Alpha
          </Button>
        </Grid>
      </Grid>
    </>
  );
  // console.log(z);
  // return z;
}
