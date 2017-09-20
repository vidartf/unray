import unray as ur

# TODO: Add case with restrict to all tests here

def test_surface_plot(mesh, color_field, wireframe_params):
    p = ur.SurfacePlot(mesh=mesh)
    assert p._model_name == "SurfacePlotModel"

    p = ur.SurfacePlot(mesh=mesh, color=color_field)
    assert p._model_name == "SurfacePlotModel"

    p = ur.SurfacePlot(mesh=mesh, wireframe=wireframe_params)
    assert p._model_name == "SurfacePlotModel"

    p = ur.SurfacePlot(mesh=mesh, color=color_field, wireframe=wireframe_params)
    assert p._model_name == "SurfacePlotModel"

def test_isosurface_plot(mesh, isovalue_params, p1field, color_constant, color_field):
    p = ur.IsoSurfacePlot(mesh=mesh, color=color_field, values=isovalue_params)
    assert p._model_name == "IsoSurfacePlotModel"

    p = ur.IsoSurfacePlot(mesh=mesh, color=color_field, values=isovalue_params)
    assert p._model_name == "IsoSurfacePlotModel"

    p = ur.IsoSurfacePlot(mesh=mesh, field=p1field, color=color_constant, values=isovalue_params)
    assert p._model_name == "IsoSurfacePlotModel"

    p = ur.IsoSurfacePlot(mesh=mesh, field=p1field, color=color_field, values=isovalue_params)
    assert p._model_name == "IsoSurfacePlotModel"

def test_xray_plot(mesh, scalar_field):
    p = ur.XrayPlot(mesh=mesh, density=scalar_field)
    assert p._model_name == "XrayPlotModel"

    p = ur.XrayPlot(mesh=mesh, density=scalar_field, extinction=0.5)
    assert p._model_name == "XrayPlotModel"

def test_min_plot(mesh, color_field):
    p = ur.MinPlot(mesh=mesh, color=color_field)
    assert p._model_name == "MinPlotModel"

def test_max_plot(mesh, color_field):
    p = ur.MaxPlot(mesh=mesh, color=color_field)
    assert p._model_name == "MaxPlotModel"

def test_sum_plot(mesh, color_field, color_constant):
    p = ur.SumPlot(mesh=mesh, color=color_field)
    assert p._model_name == "SumPlotModel"

    p = ur.SumPlot(mesh=mesh, color=color_constant)
    assert p._model_name == "SumPlotModel"

def test_volume_plot(mesh, color_field, color_constant, scalar_field, scalar_constant):
    p = ur.VolumePlot(mesh=mesh, color=color_field, density=scalar_field)
    assert p._model_name == "VolumePlotModel"

    p = ur.VolumePlot(mesh=mesh, color=color_constant, density=scalar_field)
    assert p._model_name == "VolumePlotModel"

    p = ur.VolumePlot(mesh=mesh, color=color_constant, density=scalar_constant)
    assert p._model_name == "VolumePlotModel"

    p = ur.VolumePlot(mesh=mesh, color=color_field, density=scalar_constant)
    assert p._model_name == "VolumePlotModel"
