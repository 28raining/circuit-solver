import Snackbar from "@mui/material/Snackbar";
import SnackbarContent from "@mui/material/SnackbarContent";
import { MathMLToLaTeX } from "mathml-to-latex";
import { useEffect, useState, useRef, createElement } from "react";

function DangerousSetIn({ mathMLString }) {
  return <div dangerouslySetInnerHTML={{ __html: mathMLString }} />;
}
/*{<DangerousSetIn mathMLString={mathML} />}*/
export function DisplayMathML({ laplace, bilinear, handleRequestBilin, textResult, bilinearRaw }) {
  const [latexToast, setLatexToast] = useState(false);
  const [mathMLToast, setMathMLToast] = useState(false);
  if (laplace == "") return null;
  //   if (tfType == "Laplace") return null;
  //   else if (tfType == "Bilinear") {
  //     return (
  //       <div className="col">
  //         <button
  //           type="button"
  //           className="btn btn-outline-primary py-0"
  //           onClick={() => {
  //             handleRequestBilin();
  //           }}
  //         >
  //           Calculate bilinear transform
  //         </button>
  //       </div>
  //     );
  //   }
  // }
  return (
    <div key="c1" className="col-12">
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
      {[
        { name: "Laplace", value: laplace },
        { name: "Bilinear", value: bilinear },
      ].map(({ name, value }) => (
        <span key={name}>
          <div key="r1" className="row">
            <div key="title" className="col-6 text-start">
              <h3>{name} Transform</h3>
            </div>
          </div>
          <div key="r2" className="row text-center fs-3 py-2">
            <div key="c1" className="col-10" style={{ overflow: "auto" }}>
              {value == "" ? (
                <div className="col">
                  <button
                    type="button"
                    className="btn btn-outline-primary py-0"
                    onClick={() => {
                      handleRequestBilin();
                    }}
                  >
                    Calculate bilinear transform
                  </button>
                </div>
              ) : (
                <DangerousSetIn mathMLString={value} />
              )}
            </div>
            <div key="c2" className="col-2">
              <div key="c3" className="d-grid gap-1">
                <button
                  type="button"
                  className="btn btn-outline-primary py-0"
                  onClick={() => {
                    const newLatex = name=="Laplace" ? MathMLToLaTeX.convert(laplace) : MathMLToLaTeX.convert(bilinear);
                    navigator.clipboard.writeText(newLatex);
                    setLatexToast(true);
                  }}
                >
                  Copy LaTeX
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary py-0"
                  onClick={() => {
                    name=="Laplace" ? navigator.clipboard.writeText(laplace) :navigator.clipboard.writeText(bilinear);;
                    setMathMLToast(true);
                  }}
                >
                  Copy MathML
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary py-0"
                  onClick={() => {
                    // const newLatex = MathML2LaTeX.convert(mathMlString);
                    // name=="Laplace" ? navigator.clipboard.writeText(laplace) :navigator.clipboard.writeText(bilinear);;
                    var encoded_latex = name=="Laplace" ? encodeURIComponent(textResult) : encodeURIComponent(bilinearRaw);
                    var newURL = `https://www.wolframalpha.com/input?i2d=true&i=${encoded_latex}`;
                    window.open(newURL, "_blank");
                  }}
                >
                  Wolfram Alpha
                </button>
              </div>
            </div>
            {/* : html`<div className="col">
              <button
                type="button"
                className="btn btn-outline-primary py-0"
                onClick=${() => {
                  props.handleRequestBilin();
                }}
              >
                Calculate bilinear transform
              </button>
            </div>`} */}
          </div>
        </span>
      ))}
    </div>
  );
  // console.log(z);
  // return z;
}
